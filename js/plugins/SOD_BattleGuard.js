//=============================================================================
// SOD_BattleGuard.js - Active Defense / Dodge System  v3.0
// Realm of Legends: Shadows of Destiny
//=============================================================================

/*:
 * @plugindesc v3.0 Two-zone Guard/Dodge system. Strict: correct key in correct zone = success, anything else = full damage.
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
 * @desc Frames for cursor to cross the full bar at speed 1.0
 * @default 90
 *
 * @param Normal Guard Zone
 * @desc Guard zone width in pixels for normal enemies
 * @default 70
 *
 * @param Normal Dodge Zone
 * @desc Dodge zone width in pixels for normal enemies
 * @default 70
 *
 * @param Boss Guard Zone
 * @desc Guard zone width for boss enemies
 * @default 32
 *
 * @param Boss Dodge Zone
 * @desc Dodge zone width for boss enemies
 * @default 32
 *
 * @param Boss Speed
 * @desc Cursor speed multiplier for bosses
 * @default 1.6
 *
 * @param Guard Zone Position
 * @desc Guard zone center as fraction of bar width (0.0-1.0). Default 0.28
 * @default 0.28
 *
 * @param Dodge Zone Position
 * @desc Dodge zone center as fraction of bar width (0.0-1.0). Default 0.72
 * @default 0.72
 *
 * @param Perfect Guard Multiplier
 * @desc Damage multiplier on successful Guard (0.1 = 90% blocked)
 * @default 0.1
 *
 * @param Perfect Dodge Multiplier
 * @desc Damage multiplier on successful Dodge (0 = no damage)
 * @default 0
 *
 * @help
 * ============================================================================
 * How it works
 * ============================================================================
 * A cursor moves LEFT->RIGHT across the bar ONE TIME.
 *
 *   |---[GUARD]----------[DODGE]---|
 *        Cyan              Gold
 *        [A]               [S]
 *
 * Rules (strict - no partial results):
 *   Cursor in GUARD zone + press [A] -> PERFECT GUARD (0.1x damage)
 *   Cursor in DODGE zone + press [S] -> PERFECT DODGE (0 damage)
 *   Any other press (wrong key, wrong time) -> full damage, bar closes
 *   Cursor exits bar without pressing  -> full damage
 *
 * ============================================================================
 * Note Tags
 * ============================================================================
 * On SKILL:
 *   <sod_red>                Red attack - guard zone hidden, only Dodge works.
 *                            Pressing [A] at any time = instant full damage.
 *   <sod_skip>               Skip timing window entirely.
 *
 * On ENEMY:
 *   <sod_boss>               Mark as boss (tighter zone defaults).
 *   <sod_guard_zone: 30>     Override guard zone width (px).
 *   <sod_dodge_zone: 30>     Override dodge zone width (px).
 *   <sod_cursor_speed: 2.0>  Override cursor speed multiplier.
 *   <sod_guard_pos: 0.25>    Override guard zone center position (fraction).
 *   <sod_dodge_pos: 0.68>    Override dodge zone center position (fraction).
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
        nGuardZone:  Number(p['Normal Guard Zone']        || 70),
        nDodgeZone:  Number(p['Normal Dodge Zone']        || 70),
        bGuardZone:  Number(p['Boss Guard Zone']          || 32),
        bDodgeZone:  Number(p['Boss Dodge Zone']          || 32),
        bossSpeed:   Number(p['Boss Speed']               || 1.6),
        guardPos:    Number(p['Guard Zone Position']      || 0.28),
        dodgePos:    Number(p['Dodge Zone Position']      || 0.72),
        pgMult:      Number(p['Perfect Guard Multiplier'] || 0.1),
        pdMult:      Number(p['Perfect Dodge Multiplier'] || 0),
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
                    speed:      Number(enemyMeta['sod_cursor_speed'] || (isBoss ? CFG.bossSpeed  : 1.0)),
                    guardPos:   Number(enemyMeta['sod_guard_pos']    || CFG.guardPos),
                    dodgePos:   Number(enemyMeta['sod_dodge_pos']    || CFG.dodgePos),
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
        var wh = 120;
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

    // Two independent zones: guard (cyan, left) and dodge (gold, right)
    Window_GuardTiming.prototype._layout = function () {
        var cw  = this.contentsWidth();
        var bW  = cw - 24;
        var bX  = 12;
        var bH  = 26;
        var bY  = this.contentsHeight() - bH - 8;

        var gz      = this._config.guardZone || CFG.nGuardZone;
        var dz      = this._config.dodgeZone || CFG.nDodgeZone;
        var gCenter = bW * (this._config.guardPos || CFG.guardPos);
        var dCenter = bW * (this._config.dodgePos || CFG.dodgePos);

        return {
            bX: bX, bY: bY, bW: bW, bH: bH,
            gL: gCenter - gz / 2,   // guard zone left edge
            gR: gCenter + gz / 2,   // guard zone right edge
            dL: dCenter - dz / 2,   // dodge zone left edge
            dR: dCenter + dz / 2,   // dodge zone right edge
        };
    };

    Window_GuardTiming.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this._active || this._finished) return;

        this._pulse++;
        var L     = this._layout();
        var speed = (L.bW / CFG.totalFrames) * (this._config.speed || 1.0);
        this._cursorPos += speed;

        var guardPressed = Input.isTriggered('sodGuard');
        var dodgePressed = Input.isTriggered('sodDodge');

        if (guardPressed || dodgePressed) {
            this._resolve(guardPressed ? 'guard' : 'dodge', L);
        } else if (this._cursorPos >= L.bW) {
            // Cursor exited bar without input - full damage, no message
            this._result = { modifier: 1.0, label: null };
            this._finish();
        }
        this.refresh();
    };

    Window_GuardTiming.prototype._resolve = function (type, L) {
        var cx   = this._cursorPos;
        var inG  = cx >= L.gL && cx <= L.gR;
        var inD  = cx >= L.dL && cx <= L.dR;

        if (type === 'guard') {
            if (!this._config.isRed && inG) {
                // Success
                this._result = { modifier: CFG.pgMult, label: '\x1bC[24]** PERFECT GUARD! **\x1bC[0]' };
            } else {
                // Wrong key, wrong zone, or red attack - full damage, no message
                this._result = { modifier: 1.0, label: null };
            }
        } else { // dodge
            if (inD) {
                // Success
                this._result = { modifier: CFG.pdMult, label: '\x1bC[24]** PERFECT DODGE! **\x1bC[0]' };
            } else {
                // Wrong zone - full damage, no message
                this._result = { modifier: 1.0, label: null };
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
        var inD   = cx >= L.dL && cx <= L.dR;
        var pulse = 0.6 + 0.4 * Math.abs(Math.sin(this._pulse * 0.13));

        // ── Title ─────────────────────────────────────────────────────────
        this.contents.fontSize = 15;
        this.contents.fontBold = true;
        if (this._config.isRed) {
            this.changeTextColor(this.textColor(18));
            this.drawText('[!] RED ATTACK  -  Dodge Only  [S]', 0, 2, cw, 'center');
        } else if (this._config.isBoss) {
            this.changeTextColor(this.textColor(6));
            this.drawText('[!] BOSS  -  [A] Guard          [S] Dodge', 0, 2, cw, 'center');
        } else {
            this.changeTextColor(this.textColor(17));
            this.drawText('INCOMING  -  [A] Guard          [S] Dodge', 0, 2, cw, 'center');
        }
        this.contents.fontBold = false;
        this.resetTextColor();

        ctx.save();

        // ── Bar background ────────────────────────────────────────────────
        ctx.fillStyle = 'rgba(12,12,25,0.92)';
        ctx.fillRect(L.bX, L.bY, L.bW, L.bH);
        ctx.strokeStyle = 'rgba(100,100,160,0.3)';
        ctx.lineWidth   = 1;
        ctx.strokeRect(L.bX + 0.5, L.bY + 0.5, L.bW - 1, L.bH - 1);

        // ── Guard zone (cyan) - hidden for red attacks ────────────────────
        if (!this._config.isRed) {
            var gAlpha = inG ? pulse : 0.68;
            var gzX    = L.bX + L.gL;
            var gzW    = L.gR - L.gL;
            var ggrd   = ctx.createLinearGradient(gzX, L.bY, gzX, L.bY + L.bH);
            ggrd.addColorStop(0,   'rgba(40,220,255,' + (gAlpha * 0.7) + ')');
            ggrd.addColorStop(0.5, 'rgba(10,200,240,' + gAlpha + ')');
            ggrd.addColorStop(1,   'rgba(0,150,200,'  + (gAlpha * 0.7) + ')');
            ctx.fillStyle = ggrd;
            ctx.fillRect(gzX, L.bY, gzW, L.bH);

            // Top shine line
            ctx.fillStyle = 'rgba(180,255,255,' + (gAlpha * 0.5) + ')';
            ctx.fillRect(gzX, L.bY, gzW, 2);

            // Outer glow when cursor is inside
            if (inG) {
                ctx.save();
                ctx.shadowBlur  = 16;
                ctx.shadowColor = '#22ddff';
                ctx.strokeStyle = 'rgba(80,230,255,0.8)';
                ctx.lineWidth   = 1.5;
                ctx.strokeRect(gzX, L.bY, gzW, L.bH);
                ctx.restore();
            }

            // Label [A]
            ctx.font         = 'bold 11px GameFont, Arial';
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle    = 'rgba(200,250,255,0.9)';
            ctx.fillText('[A]', gzX + gzW / 2, L.bY + L.bH / 2);
        }

        // ── Dodge zone (gold) ─────────────────────────────────────────────
        var dAlpha = inD ? pulse : 0.68;
        var dzX    = L.bX + L.dL;
        var dzW    = L.dR - L.dL;
        var dgrd   = ctx.createLinearGradient(dzX, L.bY, dzX, L.bY + L.bH);
        dgrd.addColorStop(0,   'rgba(255,210,40,' + (dAlpha * 0.7) + ')');
        dgrd.addColorStop(0.5, 'rgba(240,175,0,'  + dAlpha + ')');
        dgrd.addColorStop(1,   'rgba(180,120,0,'  + (dAlpha * 0.7) + ')');
        ctx.fillStyle = dgrd;
        ctx.fillRect(dzX, L.bY, dzW, L.bH);

        // Top shine line
        ctx.fillStyle = 'rgba(255,245,180,' + (dAlpha * 0.5) + ')';
        ctx.fillRect(dzX, L.bY, dzW, 2);

        // Outer glow when cursor is inside
        if (inD) {
            ctx.save();
            ctx.shadowBlur  = 16;
            ctx.shadowColor = '#ffcc22';
            ctx.strokeStyle = 'rgba(255,210,60,0.8)';
            ctx.lineWidth   = 1.5;
            ctx.strokeRect(dzX, L.bY, dzW, L.bH);
            ctx.restore();
        }

        // Label [S]
        ctx.font         = 'bold 11px GameFont, Arial';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle    = 'rgba(255,245,180,0.9)';
        ctx.fillText('[S]', dzX + dzW / 2, L.bY + L.bH / 2);

        // ── Moving cursor ─────────────────────────────────────────────────
        if (!this._finished && cx < L.bW) {
            var curX    = L.bX + cx;
            var glowCol = inG ? '#44eeff' : inD ? '#ffdd22' : 'rgba(180,180,220,0.8)';

            ctx.save();
            ctx.shadowBlur  = inG || inD ? 20 : 8;
            ctx.shadowColor = glowCol;
            ctx.fillStyle   = glowCol;
            ctx.fillRect(curX - 2.5, L.bY, 5, L.bH);
            ctx.shadowBlur  = 0;
            // White core
            ctx.fillStyle   = '#ffffff';
            ctx.fillRect(curX - 1, L.bY + 2, 2, L.bH - 4);
            // Triangle above
            ctx.beginPath();
            ctx.moveTo(curX - 5, L.bY - 6);
            ctx.lineTo(curX + 5, L.bY - 6);
            ctx.lineTo(curX,     L.bY - 1);
            ctx.closePath();
            ctx.fillStyle = (inG || inD) ? glowCol : 'rgba(200,200,255,0.65)';
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();

        // ── Success result text ───────────────────────────────────────────
        if (this._finished && this._result && this._result.label) {
            var plain = this._result.label.replace(/\x1bC\[\d+\]/g, '');
            this.contents.fontSize = 21;
            this.contents.fontBold = true;
            this.changeTextColor(this.textColor(24));
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
        // On success show result briefly; on fail close immediately
        this._sodDismissTimer = -1;
    };

    Scene_Battle.prototype.isSODGuardFinished = function () {
        var win = this._sodGuardWindow;
        if (!win || !win.isFinished()) return false;

        var result = win.getResult();
        // If success (has a label), show result for a moment
        // If fail (no label), close immediately
        if (result && result.label) {
            if (this._sodDismissTimer < 0) this._sodDismissTimer = 36;
            this._sodDismissTimer--;
            if (this._sodDismissTimer <= 0) {
                win.visible = false;
                return true;
            }
            return false;
        } else {
            // Fail - close immediately
            win.visible = false;
            return true;
        }
    };

    Scene_Battle.prototype.getSODGuardResult = function () {
        return this._sodGuardWindow.getResult();
    };

})();
