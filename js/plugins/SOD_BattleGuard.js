//=============================================================================
// SOD_BattleGuard.js - Active Defense / Dodge System  v2.0
// Realm of Legends: Shadows of Destiny
//=============================================================================

/*:
 * @plugindesc v2.0 Moving-cursor Guard/Dodge system. Gradient UI. Boss support.
 * @author SOD Team
 *
 * @param Guard Key Code
 * @desc Keyboard keyCode for Guard. Default: A = 65
 * @default 65
 *
 * @param Dodge Key Code
 * @desc Keyboard keyCode for Dodge. Default: S = 83
 * @default 83
 *
 * @param Total Frames
 * @desc Frames for cursor to cross the bar at speed 1.0 (60fps base)
 * @default 90
 *
 * @param Normal Guard Zone
 * @desc Perfect Guard zone width in pixels for normal enemies
 * @default 80
 *
 * @param Normal Dodge Zone
 * @desc Perfect Dodge zone width px each side for normal enemies
 * @default 70
 *
 * @param Boss Guard Zone
 * @desc Default Perfect Guard zone width for bosses
 * @default 34
 *
 * @param Boss Dodge Zone
 * @desc Default Perfect Dodge zone width each side for bosses
 * @default 38
 *
 * @param Boss Speed
 * @desc Default cursor speed multiplier for bosses
 * @default 1.6
 *
 * @param Perfect Guard Multiplier
 * @desc Damage multiplier on Perfect Guard (0.1 = 90% blocked)
 * @default 0.1
 *
 * @param Normal Guard Multiplier
 * @desc Damage multiplier on Normal Guard
 * @default 0.5
 *
 * @param Perfect Dodge Multiplier
 * @desc Damage multiplier on Perfect Dodge (0 = fully evaded)
 * @default 0
 *
 * @param Normal Dodge Multiplier
 * @desc Damage multiplier when pressing Dodge outside zones
 * @default 0.3
 *
 * @help
 * ============================================================================
 * How it works
 * ============================================================================
 * A cursor moves LEFT->RIGHT across the bar (one pass only).
 *
 *   |------[===[###]===]------|
 *          Gold    Cyan
 *         (Dodge) (Guard)
 *
 *   Cyan zone  + [A] -> PERFECT GUARD  (0.1x damage)
 *   Gold zone  + [A] -> GUARD          (0.5x damage)
 *   Any zone   + [S] -> PERFECT DODGE  (0 damage)
 *   Outside    + [S] -> DODGE          (0.3x damage)
 *   Outside    + [A] -> MISS           (full damage)
 *   Cursor exits     -> MISS           (full damage)
 *
 * ============================================================================
 * Note Tags
 * ============================================================================
 * On SKILL:
 *   <sod_red>                Red attack - guard disabled, Dodge only.
 *   <sod_skip>               Skip timing window.
 *
 * On ENEMY:
 *   <sod_boss>               Mark as boss (tighter defaults).
 *   <sod_guard_zone: 30>     Guard zone width (px).
 *   <sod_dodge_zone: 40>     Dodge zone width per side (px).
 *   <sod_zone_offset: 50>    Zone center offset, right(+) or left(-).
 *   <sod_cursor_speed: 2.0>  Cursor speed multiplier.
 *
 * ============================================================================
 */

(function () {
    'use strict';

    var PLUGIN_NAME = 'SOD_BattleGuard';
    var p = PluginManager.parameters(PLUGIN_NAME);

    var CFG = {
        guardKey:    Number(p['Guard Key Code']           || 65),
        dodgeKey:    Number(p['Dodge Key Code']           || 83),
        totalFrames: Number(p['Total Frames']             || 90),
        nGuardZone:  Number(p['Normal Guard Zone']        || 80),
        nDodgeZone:  Number(p['Normal Dodge Zone']        || 70),
        bGuardZone:  Number(p['Boss Guard Zone']          || 34),
        bDodgeZone:  Number(p['Boss Dodge Zone']          || 38),
        bossSpeed:   Number(p['Boss Speed']               || 1.6),
        pgMult:      Number(p['Perfect Guard Multiplier'] || 0.1),
        ngMult:      Number(p['Normal Guard Multiplier']  || 0.5),
        pdMult:      Number(p['Perfect Dodge Multiplier'] || 0),
        ndMult:      Number(p['Normal Dodge Multiplier']  || 0.3),
    };

    Input.keyMapper[CFG.guardKey] = 'sodGuard';
    Input.keyMapper[CFG.dodgeKey] = 'sodDodge';

    //=========================================================================
    // BattleManager
    //=========================================================================

    var _BM_update = BattleManager.update;
    BattleManager.update = function () {
        if (this._phase === 'sod_guard') {
            this.updateSODGuard();
        } else {
            _BM_update.call(this);
        }
    };

    var _BM_updateAction = BattleManager.updateAction;
    BattleManager.updateAction = function () {
        var target  = this._targets[0];
        var subject = this._subject;

        if (subject && subject.isEnemy() && target && target.isActor() && !this._sodGuardDone) {
            var action    = this._action;
            var skillMeta = (action && action.item() && action.item().meta) || {};

            if (!skillMeta['sod_skip']) {
                var enemyMeta = subject.enemy().meta || {};
                var isBoss    = !!enemyMeta['sod_boss'];

                var config = {
                    isRed:      !!skillMeta['sod_red'],
                    isBoss:     isBoss,
                    guardZone:  Number(enemyMeta['sod_guard_zone']   || (isBoss ? CFG.bGuardZone : CFG.nGuardZone)),
                    dodgeZone:  Number(enemyMeta['sod_dodge_zone']   || (isBoss ? CFG.bDodgeZone : CFG.nDodgeZone)),
                    zoneOffset: Number(enemyMeta['sod_zone_offset']  || 0),
                    speed:      Number(enemyMeta['sod_cursor_speed'] || (isBoss ? CFG.bossSpeed : 1.0)),
                };

                this._sodGuardTarget = this._targets.shift();
                this._phase          = 'sod_guard';
                if (SceneManager._scene && SceneManager._scene.startSODGuard) {
                    SceneManager._scene.startSODGuard(config);
                }
                return;
            }
        }

        this._sodGuardDone = false;
        _BM_updateAction.call(this);
    };

    BattleManager.updateSODGuard = function () {
        var scene = SceneManager._scene;
        if (scene && scene.isSODGuardFinished && scene.isSODGuardFinished()) {
            this._sodGuardResult = scene.getSODGuardResult();
            this._sodGuardDone   = true;
            this._phase          = 'action';
            this._targets.unshift(this._sodGuardTarget);
            this._sodGuardTarget = null;
        }
    };

    var _BM_invokeNormalAction = BattleManager.invokeNormalAction;
    BattleManager.invokeNormalAction = function (subject, target) {
        if (subject.isEnemy() && target.isActor() && this._sodGuardResult) {
            BattleManager._sodActiveMult  = this._sodGuardResult.modifier;
            BattleManager._sodActiveLabel = this._sodGuardResult.label;
        }
        _BM_invokeNormalAction.call(this, subject, target);
        BattleManager._sodActiveMult  = null;
        BattleManager._sodActiveLabel = null;
        this._sodGuardResult = null;
    };

    var _GA_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function (target, critical) {
        var value = _GA_makeDamageValue.call(this, target, critical);
        var mult  = BattleManager._sodActiveMult;
        if (mult !== null && mult !== undefined) {
            value = (mult === 0) ? 0 : Math.round(value * mult);
        }
        return value;
    };

    var _WBL_displayActionResults = Window_BattleLog.prototype.displayActionResults;
    Window_BattleLog.prototype.displayActionResults = function (subject, target) {
        if (BattleManager._sodActiveLabel) {
            this.push('addText', BattleManager._sodActiveLabel);
        }
        _WBL_displayActionResults.call(this, subject, target);
    };

    //=========================================================================
    // Window_GuardTiming
    //=========================================================================

    function Window_GuardTiming() {
        this.initialize.apply(this, arguments);
    }

    Window_GuardTiming.prototype = Object.create(Window_Base.prototype);
    Window_GuardTiming.prototype.constructor = Window_GuardTiming;

    Window_GuardTiming.prototype.initialize = function () {
        var ww = 500;
        var wh = 128;
        var wx = Math.floor((Graphics.boxWidth  - ww) / 2);
        var wy = Math.floor( Graphics.boxHeight * 0.54);
        Window_Base.prototype.initialize.call(this, wx, wy, ww, wh);
        this.opacity    = 220;
        this.visible    = false;
        this._active    = false;
        this._finished  = false;
        this._cursorPos = 0;
        this._config    = {};
        this._result    = null;
        this._pulse     = 0;
    };

    Window_GuardTiming.prototype.start = function (config) {
        this._config    = config;
        this._cursorPos = 0;
        this._active    = true;
        this._finished  = false;
        this._result    = null;
        this._pulse     = 0;
        this.visible    = true;
        this.refresh();
    };

    Window_GuardTiming.prototype.isFinished = function () { return this._finished; };
    Window_GuardTiming.prototype.getResult  = function () { return this._result;   };

    Window_GuardTiming.prototype._layout = function () {
        var cw  = this.contentsWidth();
        var bW  = cw - 24;
        var bX  = 12;
        var bH  = 26;
        var bY  = this.contentsHeight() - bH - 8;
        var gz  = this._config.guardZone || CFG.nGuardZone;
        var dz  = this._config.dodgeZone || CFG.nDodgeZone;
        var off = this._config.zoneOffset || 0;
        var maxOff = bW / 2 - gz / 2 - dz - 8;
        off = Math.max(-maxOff, Math.min(maxOff, off));
        var center = bW / 2 + off;
        return {
            bX: bX, bY: bY, bW: bW, bH: bH,
            gL: center - gz / 2,
            gR: center + gz / 2,
            dL: center - gz / 2 - dz,
            dR: center + gz / 2 + dz,
        };
    };

    Window_GuardTiming.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this._active || this._finished) return;

        this._pulse++;
        var L     = this._layout();
        var speed = (L.bW / CFG.totalFrames) * (this._config.speed || 1.0);
        this._cursorPos += speed;

        if (Input.isTriggered('sodGuard')) {
            this._resolve('guard', L);
        } else if (Input.isTriggered('sodDodge')) {
            this._resolve('dodge', L);
        } else if (this._cursorPos >= L.bW) {
            this._result = { modifier: 1.0, label: null };
            this._finish();
        }
        this.refresh();
    };

    Window_GuardTiming.prototype._resolve = function (type, L) {
        var cx    = this._cursorPos;
        var inG   = cx >= L.gL && cx <= L.gR;
        var inAny = cx >= L.dL && cx <= L.dR;

        if (type === 'guard') {
            if (this._config.isRed) {
                this._result = { modifier: 1.0,        label: '\x1bC[18]GUARD BLOCKED!\x1bC[0]' };
            } else if (inG) {
                this._result = { modifier: CFG.pgMult, label: '\x1bC[24]** PERFECT GUARD! **\x1bC[0]' };
            } else if (inAny) {
                this._result = { modifier: CFG.ngMult, label: '\x1bC[3]GUARD\x1bC[0]' };
            } else {
                this._result = { modifier: 1.0,        label: null };
            }
        } else {
            if (inAny) {
                this._result = { modifier: CFG.pdMult, label: '\x1bC[24]** PERFECT DODGE! **\x1bC[0]' };
            } else {
                this._result = { modifier: CFG.ndMult, label: '\x1bC[3]DODGE\x1bC[0]' };
            }
        }
        this._finish();
    };

    Window_GuardTiming.prototype._finish = function () {
        this._active   = false;
        this._finished = true;
        this.refresh();
    };

    //-------------------------------------------------------------------------
    // Drawing
    //-------------------------------------------------------------------------

    Window_GuardTiming.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();

        var ctx = this.contents._context;
        var cw  = this.contentsWidth();
        var L   = this._layout();
        var cx  = Math.min(this._cursorPos, L.bW);
        var inG   = cx >= L.gL && cx <= L.gR;
        var inAny = cx >= L.dL && cx <= L.dR;
        var pulse = 0.65 + 0.35 * Math.abs(Math.sin(this._pulse * 0.12));

        // ── Title text ────────────────────────────────────────────────────
        this.contents.fontSize = 15;
        this.contents.fontBold = true;
        if (this._config.isRed) {
            this.changeTextColor(this.textColor(18));
            this.drawText('[!] RED ATTACK - Dodge Only  [S]', 0, 2, cw, 'center');
        } else if (this._config.isBoss) {
            this.changeTextColor(this.textColor(6));
            this.drawText('[!] BOSS ATTACK - [A] Guard   [S] Dodge', 0, 2, cw, 'center');
        } else {
            this.changeTextColor(this.textColor(17));
            this.drawText('INCOMING ATTACK - [A] Guard   [S] Dodge', 0, 2, cw, 'center');
        }
        this.contents.fontBold = false;
        this.resetTextColor();

        ctx.save();

        // ── Bar background ────────────────────────────────────────────────
        var bgGrad = ctx.createLinearGradient(L.bX, L.bY, L.bX, L.bY + L.bH);
        bgGrad.addColorStop(0, 'rgba(18,18,35,0.95)');
        bgGrad.addColorStop(1, 'rgba(8,8,18,0.95)');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(L.bX, L.bY, L.bW, L.bH);

        ctx.strokeStyle = 'rgba(120,120,180,0.35)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(L.bX + 0.5, L.bY + 0.5, L.bW - 1, L.bH - 1);

        // ── Left dodge zone (gold gradient) ──────────────────────────────
        var dAlpha = (inAny && !inG) ? pulse : 0.65;
        var ldW = L.gL - L.dL;
        if (ldW > 0) {
            var ldX  = L.bX + L.dL;
            var lgrd = ctx.createLinearGradient(ldX, 0, ldX + ldW, 0);
            lgrd.addColorStop(0,    'rgba(160,110,0,0)');
            lgrd.addColorStop(0.3,  'rgba(200,150,0,' + (dAlpha * 0.8) + ')');
            lgrd.addColorStop(1,    'rgba(255,195,10,' + dAlpha + ')');
            ctx.fillStyle = lgrd;
            ctx.fillRect(ldX, L.bY, ldW, L.bH);
        }

        // ── Right dodge zone (gold gradient) ─────────────────────────────
        var rdW = L.dR - L.gR;
        if (rdW > 0) {
            var rdX  = L.bX + L.gR;
            var rgrd = ctx.createLinearGradient(rdX, 0, rdX + rdW, 0);
            rgrd.addColorStop(0,    'rgba(255,195,10,' + dAlpha + ')');
            rgrd.addColorStop(0.7,  'rgba(200,150,0,' + (dAlpha * 0.8) + ')');
            rgrd.addColorStop(1,    'rgba(160,110,0,0)');
            ctx.fillStyle = rgrd;
            ctx.fillRect(rdX, L.bY, rdW, L.bH);
        }

        // ── Guard zone (cyan gradient, hidden for red attacks) ────────────
        if (!this._config.isRed) {
            var gAlpha = inG ? pulse : 0.72;
            var gzX    = L.bX + L.gL;
            var gzW    = L.gR - L.gL;
            var ggrd   = ctx.createLinearGradient(gzX, 0, gzX + gzW, 0);
            ggrd.addColorStop(0,   'rgba(0,145,210,' + (gAlpha * 0.55) + ')');
            ggrd.addColorStop(0.5, 'rgba(20,210,255,' + gAlpha + ')');
            ggrd.addColorStop(1,   'rgba(0,145,210,' + (gAlpha * 0.55) + ')');
            ctx.fillStyle = ggrd;
            ctx.fillRect(gzX, L.bY, gzW, L.bH);
            // Highlight lines
            ctx.fillStyle = 'rgba(120,240,255,0.4)';
            ctx.fillRect(gzX, L.bY,             gzW, 1);
            ctx.fillRect(gzX, L.bY + L.bH - 1,  gzW, 1);
        }

        // ── Zone boundary tick marks ──────────────────────────────────────
        var drawTick = function (x, color) {
            ctx.strokeStyle = color;
            ctx.lineWidth   = 1.5;
            ctx.beginPath();
            ctx.moveTo(L.bX + x, L.bY - 3);
            ctx.lineTo(L.bX + x, L.bY + L.bH + 3);
            ctx.stroke();
        };
        drawTick(L.dL, 'rgba(255,210,60,0.55)');
        drawTick(L.dR, 'rgba(255,210,60,0.55)');
        if (!this._config.isRed) {
            drawTick(L.gL, 'rgba(60,220,255,0.65)');
            drawTick(L.gR, 'rgba(60,220,255,0.65)');
        }

        // ── Small key labels inside zones ────────────────────────────────
        ctx.font         = 'bold 10px GameFont, Arial';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        var midY = L.bY + L.bH / 2;
        if (!this._config.isRed && L.gR - L.gL >= 18) {
            ctx.fillStyle = 'rgba(180,240,255,0.85)';
            ctx.fillText('[A]', L.bX + (L.gL + L.gR) / 2, midY);
        }
        if (L.gL - L.dL >= 22) {
            ctx.fillStyle = 'rgba(255,220,100,0.75)';
            ctx.fillText('[S]', L.bX + (L.dL + L.gL) / 2, midY);
        }
        if (L.dR - L.gR >= 22) {
            ctx.fillStyle = 'rgba(255,220,100,0.75)';
            ctx.fillText('[S]', L.bX + (L.gR + L.dR) / 2, midY);
        }

        // ── Moving cursor ─────────────────────────────────────────────────
        if (!this._finished && cx < L.bW) {
            var curX    = L.bX + cx;
            var glowCol = inG   ? '#44eeff'
                        : inAny ? '#ffdd44'
                        :         'rgba(160,160,220,0.9)';
            ctx.save();
            ctx.shadowBlur  = inAny ? 22 : 10;
            ctx.shadowColor = glowCol;
            ctx.fillStyle   = glowCol;
            ctx.fillRect(curX - 2.5, L.bY, 5, L.bH);
            ctx.shadowBlur  = 0;
            ctx.fillStyle   = '#ffffff';
            ctx.fillRect(curX - 1, L.bY + 2, 2, L.bH - 4);
            // Triangle tip above bar
            ctx.beginPath();
            ctx.moveTo(curX - 5, L.bY - 6);
            ctx.lineTo(curX + 5, L.bY - 6);
            ctx.lineTo(curX,     L.bY - 1);
            ctx.closePath();
            ctx.fillStyle = inAny ? glowCol : 'rgba(200,200,255,0.7)';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // ── Result text ───────────────────────────────────────────────────
        if (this._finished && this._result && this._result.label) {
            var plain = this._result.label.replace(/\x1bC\[\d+\]/g, '');
            this.contents.fontSize = 21;
            this.contents.fontBold = true;
            var col = (plain.indexOf('PERFECT') >= 0) ? this.textColor(24)
                    : (plain.indexOf('BLOCKED') >= 0) ? this.textColor(18)
                    : this.textColor(3);
            this.changeTextColor(col);
            this.drawText(plain, 0, L.bY - 30, cw, 'center');
            this.contents.fontBold = false;
            this.resetTextColor();
        }

        if (this.contents._setDirty) this.contents._setDirty();
        this.contents.fontSize = this.standardFontSize();
    };

    //=========================================================================
    // Scene_Battle
    //=========================================================================

    var _SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function () {
        _SB_createAllWindows.call(this);
        this._sodGuardWindow = new Window_GuardTiming();
        this.addChild(this._sodGuardWindow);
    };

    Scene_Battle.prototype.startSODGuard = function (config) {
        this._sodGuardWindow.start(config);
        this._sodDismissTimer = -1;
    };

    Scene_Battle.prototype.isSODGuardFinished = function () {
        var win = this._sodGuardWindow;
        if (!win || !win.isFinished()) return false;
        if (this._sodDismissTimer < 0) this._sodDismissTimer = 38;
        this._sodDismissTimer--;
        if (this._sodDismissTimer <= 0) {
            win.visible = false;
            return true;
        }
        return false;
    };

    Scene_Battle.prototype.getSODGuardResult = function () {
        return this._sodGuardWindow.getResult();
    };

})();
