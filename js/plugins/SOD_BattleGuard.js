//=============================================================================
// SOD_BattleGuard.js - Active Defense / Dodge Timing System
// Realm of Legends: Shadows of Destiny
// Version: 1.0.0
//=============================================================================

/*:
 * @plugindesc v1.0 Active Guard/Dodge timing window for enemy attacks.
 * Yellow attack: Guard [A] or Dodge [S]. Red attack: Dodge [S] only.
 * @author SOD Team
 *
 * @param Guard Key Code
 * @desc Keyboard keyCode for Guard action. Default: A = 65
 * @default 65
 *
 * @param Dodge Key Code
 * @desc Keyboard keyCode for Dodge action. Default: S = 83
 * @default 83
 *
 * @param Total Frames
 * @desc Duration of the timing window in frames (60fps = 1 second).
 * @default 90
 *
 * @param Perfect Guard Window
 * @desc Frames remaining at which Perfect Guard zone starts (short = harder).
 * @default 20
 *
 * @param Perfect Dodge Window
 * @desc Frames remaining at which Perfect Dodge zone starts (wider = easier).
 * @default 38
 *
 * @param Perfect Guard Multiplier
 * @desc Damage multiplier for Perfect Guard. 0.1 = 90% blocked.
 * @default 0.1
 *
 * @param Normal Guard Multiplier
 * @desc Damage multiplier for Normal Guard.
 * @default 0.5
 *
 * @param Perfect Dodge Multiplier
 * @desc Damage multiplier for Perfect Dodge. 0 = fully evaded.
 * @default 0
 *
 * @param Normal Dodge Multiplier
 * @desc Damage multiplier for Normal Dodge.
 * @default 0.3
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * When an enemy attacks an actor, a timing bar appears at the bottom of the
 * screen. The bar depletes over time, revealing two colored zones:
 *
 *   [Gold zone]  - Perfect Dodge zone (wider, easier)
 *   [Cyan zone]  - Perfect Guard zone (narrower, inside gold - harder)
 *
 * Press Guard [A] or Dodge [S] when the bar reaches these zones for best results.
 *
 * Results:
 *   Perfect Guard  - Damage reduced to ~10% (blocked)
 *   Normal Guard   - Damage reduced to ~50%
 *   Perfect Dodge  - 0 damage (full evade)
 *   Normal Dodge   - Damage reduced to ~30%
 *   No Input       - Full damage
 *
 * ============================================================================
 * Note Tags (on Skills or Enemy Actions via Troop event notes)
 * ============================================================================
 *   <sod_red>    Red attack — Guard is invalid, Dodge only.
 *   <sod_skip>   Skip the timing window entirely for this action.
 *
 * ============================================================================
 */

(function () {
    'use strict';

    var PLUGIN_NAME = 'SOD_BattleGuard';
    var p = PluginManager.parameters(PLUGIN_NAME);

    var CFG = {
        guardKey:        Number(p['Guard Key Code']         || 65),
        dodgeKey:        Number(p['Dodge Key Code']         || 83),
        totalFrames:     Number(p['Total Frames']           || 90),
        pgWindow:        Number(p['Perfect Guard Window']   || 20),
        pdWindow:        Number(p['Perfect Dodge Window']   || 38),
        pgMult:          Number(p['Perfect Guard Multiplier'] || 0.1),
        ngMult:          Number(p['Normal Guard Multiplier']  || 0.5),
        pdMult:          Number(p['Perfect Dodge Multiplier'] || 0),
        ndMult:          Number(p['Normal Dodge Multiplier']  || 0.3),
    };

    // Register custom key names
    Input.keyMapper[CFG.guardKey] = 'sodGuard';
    Input.keyMapper[CFG.dodgeKey] = 'sodDodge';

    //=========================================================================
    // BattleManager – intercept enemy → actor attacks
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
            var action = this._action;
            var meta   = (action && action.item() && action.item().meta) ? action.item().meta : {};

            if (!meta['sod_skip']) {
                // Intercept – switch to guard phase
                this._sodGuardTarget = this._targets.shift();
                this._sodIsRed       = !!meta['sod_red'];
                this._phase          = 'sod_guard';

                if (SceneManager._scene && SceneManager._scene.startSODGuard) {
                    SceneManager._scene.startSODGuard(this._sodIsRed);
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
            // Restore the target so updateAction can process it normally
            this._targets.unshift(this._sodGuardTarget);
            this._sodGuardTarget = null;
        }
    };

    // Apply guard/dodge modifier to damage
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

    // Show result label in battle log
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
        var ww = 440;
        var wh = 120;
        var wx = Math.floor((Graphics.boxWidth - ww) / 2);
        var wy = Math.floor(Graphics.boxHeight * 0.56);
        Window_Base.prototype.initialize.call(this, wx, wy, ww, wh);
        this.opacity    = 220;
        this.visible    = false;
        this._active    = false;
        this._finished  = false;
        this._isRed     = false;
        this._frames    = 0;
        this._result    = null;
        this._totalFrames = CFG.totalFrames;
    };

    Window_GuardTiming.prototype.start = function (isRed) {
        this._isRed    = isRed;
        this._frames   = this._totalFrames;
        this._active   = true;
        this._finished = false;
        this._result   = null;
        this.visible   = true;
        this.refresh();
    };

    Window_GuardTiming.prototype.isFinished  = function () { return this._finished; };
    Window_GuardTiming.prototype.getResult   = function () { return this._result;   };

    Window_GuardTiming.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this._active || this._finished) return;

        if (Input.isTriggered('sodGuard')) {
            this._resolve('guard');
        } else if (Input.isTriggered('sodDodge')) {
            this._resolve('dodge');
        } else {
            this._frames--;
            if (this._frames <= 0) {
                this._frames = 0;
                this._result = { modifier: 1.0, label: null };
                this._finish();
            }
        }
        this.refresh();
    };

    Window_GuardTiming.prototype._resolve = function (type) {
        var f   = this._frames;
        var pgw = CFG.pgWindow;
        var pdw = CFG.pdWindow;

        if (type === 'guard') {
            if (this._isRed) {
                this._result = { modifier: 1.0, label: '\x1bC[18]GUARD BLOCKED!\x1bC[0]' };
            } else if (f <= pgw) {
                this._result = { modifier: CFG.pgMult, label: '\x1bC[24]★ PERFECT GUARD! ★\x1bC[0]' };
            } else {
                this._result = { modifier: CFG.ngMult, label: '\x1bC[3]GUARD\x1bC[0]' };
            }
        } else {
            if (f <= pdw) {
                this._result = { modifier: CFG.pdMult, label: '\x1bC[24]★ PERFECT DODGE! ★\x1bC[0]' };
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

    Window_GuardTiming.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();

        var cw  = this.contentsWidth();
        var ch  = this.contentsHeight();
        var bH  = 22;                 // bar height
        var bW  = cw - 20;
        var bX  = 10;
        var bY  = ch - bH - 8;
        var tot = this._totalFrames;

        // ── Title ──────────────────────────────────────────────────────────
        this.contents.fontSize = 17;
        this.contents.fontBold = true;
        if (this._isRed) {
            this.changeTextColor(this.textColor(18));
            this.drawText('⚠ RED ATTACK  —  DODGE ONLY', 0, 0, cw, 'center');
        } else {
            this.changeTextColor(this.textColor(17));
            this.drawText('⚡ INCOMING ATTACK', 0, 0, cw, 'center');
        }
        this.contents.fontBold = false;

        // ── Key hints ──────────────────────────────────────────────────────
        this.contents.fontSize = 14;
        this.resetTextColor();
        if (this._isRed) {
            this.drawText('[S]  Dodge', 0, 22, cw, 'center');
        } else {
            this.drawText('[A]  Guard        [S]  Dodge', 0, 22, cw, 'center');
        }

        // ── Bar ────────────────────────────────────────────────────────────
        // Background
        this.contents.fillRect(bX, bY, bW, bH, 'rgba(10,10,10,0.8)');

        // Perfect Dodge zone (gold, wider)
        var pdStart = Math.floor(bX + bW * (1 - CFG.pdWindow / tot));
        this.contents.fillRect(pdStart, bY, bW - (pdStart - bX), bH, 'rgba(200,160,0,0.5)');

        // Perfect Guard zone (cyan, narrower) — only for yellow attacks
        if (!this._isRed) {
            var pgStart = Math.floor(bX + bW * (1 - CFG.pgWindow / tot));
            this.contents.fillRect(pgStart, bY, bW - (pgStart - bX), bH, 'rgba(0,180,220,0.6)');
        }

        // Remaining-time fill (depletes left→right)
        var ratio  = this._frames / tot;
        var fillW  = Math.floor(bW * ratio);
        var fColor = this._isRed ? 'rgba(220,60,60,0.9)' : 'rgba(80,160,240,0.9)';
        if (fillW > 0) {
            this.contents.fillRect(bX, bY, fillW, bH, fColor);
        }

        // ── Result text (shown after input) ───────────────────────────────
        if (this._finished && this._result && this._result.label) {
            this.contents.fontSize = 20;
            this.contents.fontBold = true;
            // Strip escape codes for plain drawing
            var plain = this._result.label.replace(/\x1bC\[\d+\]/g, '');
            var color = (plain.indexOf('PERFECT') >= 0) ? this.textColor(24)
                      : (plain.indexOf('BLOCKED') >= 0) ? this.textColor(18)
                      : this.textColor(3);
            this.changeTextColor(color);
            this.drawText(plain, 0, bY - 28, cw, 'center');
            this.contents.fontBold = false;
            this.resetTextColor();
        }

        // Restore defaults
        this.contents.fontSize = this.standardFontSize();
    };

    //=========================================================================
    // Scene_Battle – host the timing window
    //=========================================================================

    var _SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function () {
        _SB_createAllWindows.call(this);
        this._sodGuardWindow = new Window_GuardTiming();
        this.addChild(this._sodGuardWindow);
    };

    Scene_Battle.prototype.startSODGuard = function (isRed) {
        this._sodGuardWindow.start(isRed);
        this._sodDismissTimer = -1;
    };

    Scene_Battle.prototype.isSODGuardFinished = function () {
        var win = this._sodGuardWindow;
        if (!win || !win.isFinished()) return false;

        if (this._sodDismissTimer < 0) {
            this._sodDismissTimer = 36; // show result for 36 frames (~0.6s)
        }
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
