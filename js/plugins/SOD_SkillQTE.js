//=============================================================================
// SOD_SkillQTE.js - Skill QTE System
// Realm of Legends: Shadows of Destiny
// Version: 1.0.0
//=============================================================================

/*:
 * @plugindesc v1.0 QTE (Quick-Time Event) mini-game when actors use skills.
 * Press the shown directional keys in sequence to boost skill power.
 * @author SOD Team
 *
 * @param Sequence Length
 * @desc Number of key prompts per QTE sequence.
 * @default 4
 *
 * @param Frames Per Key
 * @desc How many frames the player has to press each key (60 = 1 second).
 * @default 55
 *
 * @param Perfect Multiplier
 * @desc Damage multiplier when all keys are hit (100% accuracy).
 * @default 1.5
 *
 * @param Great Multiplier
 * @desc Damage multiplier at 75%+ accuracy.
 * @default 1.2
 *
 * @param Good Multiplier
 * @desc Damage multiplier at 50%+ accuracy.
 * @default 1.0
 *
 * @param Fail Multiplier
 * @desc Damage multiplier below 50% accuracy.
 * @default 0.7
 *
 * @help
 * ============================================================================
 * Introduction
 * ============================================================================
 * When an actor uses a skill (not a basic attack), a QTE window appears
 * showing a sequence of arrow key prompts (↑ ↓ ← →).
 *
 * Press each arrow key when it is highlighted. Each key has its own timer bar.
 *
 * Results:
 *   100% correct  →  ★ PERFECT!  (1.5× damage by default)
 *   75%+  correct  →  ◆ GREAT!   (1.2×)
 *   50%+  correct  →  ● GOOD     (1.0×)
 *   <50%  correct  →  ✕ MISS...  (0.7×)
 *
 * ============================================================================
 * Note Tags (on Skill database entries)
 * ============================================================================
 *   <sod_no_qte>        Skip QTE for this skill (executes normally).
 *   <sod_qte_len: N>    Override sequence length for this skill (e.g. N=6).
 *
 * ============================================================================
 * Load order
 * ============================================================================
 * SOD_BattleGuard must appear above SOD_SkillQTE in the plugin list.
 *
 * ============================================================================
 */

(function () {
    'use strict';

    var PLUGIN_NAME = 'SOD_SkillQTE';
    var p = PluginManager.parameters(PLUGIN_NAME);

    var CFG = {
        seqLen:    Number(p['Sequence Length']    || 4),
        framesKey: Number(p['Frames Per Key']     || 55),
        multPerf:  Number(p['Perfect Multiplier'] || 1.5),
        multGreat: Number(p['Great Multiplier']   || 1.2),
        multGood:  Number(p['Good Multiplier']    || 1.0),
        multFail:  Number(p['Fail Multiplier']    || 0.7),
    };

    var QTE_KEYS   = ['up', 'down', 'left', 'right'];
    var QTE_LABELS = { up: '↑', down: '↓', left: '←', right: '→' };

    //=========================================================================
    // BattleManager – intercept actor skill actions
    //=========================================================================

    // Chain on top of SOD_BattleGuard's alias (or native if guard not loaded)
    var _BM_update = BattleManager.update;
    BattleManager.update = function () {
        if (this._phase === 'sod_qte') {
            this.updateSODQTE();
        } else {
            _BM_update.call(this);
        }
    };

    var _BM_updateAction = BattleManager.updateAction;
    BattleManager.updateAction = function () {
        var subject = this._subject;
        var action  = this._action;

        if (subject && subject.isActor() && action && action.isSkill() && !this._sodQTEDone) {
            var item = action.item();
            // Skip for basic Attack, Guard commands, and <sod_no_qte> tagged skills
            var isAttack  = (item.id === subject.attackSkillId());
            var isGuardSk = (item.id === subject.guardSkillId());
            var noQTE     = (item.meta && item.meta['sod_no_qte']);

            if (!isAttack && !isGuardSk && !noQTE) {
                var seqLen = (item.meta && item.meta['sod_qte_len'])
                           ? Number(item.meta['sod_qte_len'])
                           : CFG.seqLen;

                this._phase = 'sod_qte';
                if (SceneManager._scene && SceneManager._scene.startSODQTE) {
                    SceneManager._scene.startSODQTE(seqLen);
                }
                return;
            }
        }

        this._sodQTEDone = false;
        _BM_updateAction.call(this);
    };

    BattleManager.updateSODQTE = function () {
        var scene = SceneManager._scene;
        if (scene && scene.isSODQTEFinished && scene.isSODQTEFinished()) {
            this._sodQTEResult = scene.getSODQTEResult();
            this._sodQTEDone   = true;
            this._phase        = 'action';
        }
    };

    // Apply QTE multiplier to actor skill damage
    var _BM_invokeNormalAction = BattleManager.invokeNormalAction;
    BattleManager.invokeNormalAction = function (subject, target) {
        if (subject.isActor() && this._sodQTEResult) {
            BattleManager._sodQTEMult  = this._sodQTEResult.modifier;
            BattleManager._sodQTELabel = this._sodQTEResult.label;
        }
        _BM_invokeNormalAction.call(this, subject, target);
        BattleManager._sodQTEMult  = null;
        BattleManager._sodQTELabel = null;
        this._sodQTEResult = null;
    };

    var _GA_makeDamageValue = Game_Action.prototype.makeDamageValue;
    Game_Action.prototype.makeDamageValue = function (target, critical) {
        var value = _GA_makeDamageValue.call(this, target, critical);
        var mult  = BattleManager._sodQTEMult;
        if (mult !== null && mult !== undefined) {
            value = Math.round(value * mult);
        }
        return value;
    };

    // Show QTE result label in battle log
    var _WBL_displayActionResults = Window_BattleLog.prototype.displayActionResults;
    Window_BattleLog.prototype.displayActionResults = function (subject, target) {
        if (BattleManager._sodQTELabel) {
            this.push('addText', BattleManager._sodQTELabel);
        }
        _WBL_displayActionResults.call(this, subject, target);
    };

    //=========================================================================
    // Window_SkillQTE
    //=========================================================================

    function Window_SkillQTE() {
        this.initialize.apply(this, arguments);
    }

    Window_SkillQTE.prototype = Object.create(Window_Base.prototype);
    Window_SkillQTE.prototype.constructor = Window_SkillQTE;

    Window_SkillQTE.prototype.initialize = function () {
        var ww = 460;
        var wh = 140;
        var wx = Math.floor((Graphics.boxWidth - ww) / 2);
        var wy = Math.floor(Graphics.boxHeight * 0.25);
        Window_Base.prototype.initialize.call(this, wx, wy, ww, wh);
        this.opacity   = 220;
        this.visible   = false;
        this._active   = false;
        this._finished = false;
        this._sequence = [];
        this._index    = 0;
        this._keyTimer = 0;
        this._hits     = 0;
        this._result   = null;
        this._seqLen   = CFG.seqLen;
    };

    Window_SkillQTE.prototype.start = function (seqLen) {
        this._seqLen   = seqLen || CFG.seqLen;
        this._sequence = this._generateSequence(this._seqLen);
        this._index    = 0;
        this._keyTimer = CFG.framesKey;
        this._hits     = 0;
        this._active   = true;
        this._finished = false;
        this._result   = null;
        this.visible   = true;
        this.refresh();
    };

    Window_SkillQTE.prototype._generateSequence = function (len) {
        var seq = [];
        for (var i = 0; i < len; i++) {
            seq.push(QTE_KEYS[Math.floor(Math.random() * QTE_KEYS.length)]);
        }
        return seq;
    };

    Window_SkillQTE.prototype.isFinished  = function () { return this._finished; };
    Window_SkillQTE.prototype.getResult   = function () { return this._result;   };

    Window_SkillQTE.prototype.update = function () {
        Window_Base.prototype.update.call(this);
        if (!this._active || this._finished) return;

        var current = this._sequence[this._index];
        var hit     = Input.isTriggered(current);
        var miss    = !hit && this._anyOtherKeyTriggered(current);

        if (hit) {
            this._hits++;
            this._advanceKey();
        } else if (miss) {
            this._advanceKey(); // wrong key = miss this step
        } else {
            this._keyTimer--;
            if (this._keyTimer <= 0) {
                this._advanceKey(); // timed out = miss
            }
        }
        this.refresh();
    };

    Window_SkillQTE.prototype._anyOtherKeyTriggered = function (correct) {
        for (var i = 0; i < QTE_KEYS.length; i++) {
            if (QTE_KEYS[i] !== correct && Input.isTriggered(QTE_KEYS[i])) return true;
        }
        return false;
    };

    Window_SkillQTE.prototype._advanceKey = function () {
        this._index++;
        if (this._index >= this._seqLen) {
            this._resolve();
        } else {
            this._keyTimer = CFG.framesKey;
        }
    };

    Window_SkillQTE.prototype._resolve = function () {
        var ratio = this._hits / this._seqLen;
        var mult, label;

        if (ratio >= 1.0) {
            mult  = CFG.multPerf;
            label = '\x1bC[24]★ PERFECT! ★\x1bC[0]';
        } else if (ratio >= 0.75) {
            mult  = CFG.multGreat;
            label = '\x1bC[24]◆ GREAT! ◆\x1bC[0]';
        } else if (ratio >= 0.5) {
            mult  = CFG.multGood;
            label = '\x1bC[3]● GOOD\x1bC[0]';
        } else {
            mult  = CFG.multFail;
            label = '\x1bC[18]✕ MISS...\x1bC[0]';
        }

        this._result   = { ratio: ratio, modifier: mult, label: label };
        this._active   = false;
        this._finished = true;
        this.refresh();
    };

    // ── Visual constants ──────────────────────────────────────────────────
    var KEY_W   = 60;  // each key block width
    var KEY_H   = 50;  // each key block height
    var KEY_GAP = 10;  // gap between blocks

    Window_SkillQTE.prototype.refresh = function () {
        if (!this.contents) return;
        this.contents.clear();

        var cw = this.contentsWidth();
        var ch = this.contentsHeight();

        // ── Title bar ──────────────────────────────────────────────────────
        this.contents.fontSize = 16;
        this.contents.fontBold = true;
        this.changeTextColor(this.textColor(24));
        this.drawText('◈  SKILL ACTIVATION  ◈', 0, 0, cw, 'center');
        this.contents.fontBold = false;
        this.resetTextColor();

        // If finished, show result
        if (this._finished && this._result) {
            this.contents.fontSize = 26;
            this.contents.fontBold = true;
            var plain = this._result.label.replace(/\x1bC\[\d+\]/g, '');
            var col = (plain.indexOf('PERFECT') >= 0 || plain.indexOf('GREAT') >= 0)
                    ? this.textColor(24)
                    : (plain.indexOf('MISS') >= 0) ? this.textColor(18)
                    : this.textColor(3);
            this.changeTextColor(col);
            this.drawText(plain, 0, ch / 2 - 16, cw, 'center');
            this.contents.fontBold = false;
            this.resetTextColor();
            this.contents.fontSize = this.standardFontSize();
            return;
        }

        // ── Key blocks ─────────────────────────────────────────────────────
        var totalW  = this._seqLen * KEY_W + (this._seqLen - 1) * KEY_GAP;
        var startX  = Math.floor((cw - totalW) / 2);
        var blockY  = 28;

        for (var i = 0; i < this._seqLen; i++) {
            var bx    = startX + i * (KEY_W + KEY_GAP);
            var key   = this._sequence[i];
            var label = QTE_LABELS[key] || '?';
            var done  = (i < this._index);
            var cur   = (i === this._index);

            // Block background
            var bgColor;
            if (done) {
                bgColor = 'rgba(80,80,80,0.6)';   // faded – already passed
            } else if (cur) {
                bgColor = 'rgba(0,120,200,0.85)';  // active – bright blue
            } else {
                bgColor = 'rgba(40,40,60,0.7)';    // upcoming – dark
            }
            this.contents.fillRect(bx, blockY, KEY_W, KEY_H, bgColor);

            // Arrow label
            this.contents.fontSize = cur ? 28 : 22;
            this.contents.fontBold = cur;
            if (done) {
                this.changeTextColor('rgba(100,100,100,1)');
            } else if (cur) {
                this.changeTextColor(this.textColor(0));
            } else {
                this.changeTextColor('rgba(160,160,160,1)');
            }
            this.drawText(label, bx, blockY + 8, KEY_W, 'center');
            this.contents.fontBold = false;
            this.resetTextColor();
        }

        // ── Timer bar for current key ───────────────────────────────────────
        var barY    = blockY + KEY_H + 8;
        var barH    = 10;
        var barW    = cw - 20;
        var barX    = 10;
        var ratio   = this._keyTimer / CFG.framesKey;
        var barFill = Math.floor(barW * ratio);

        this.contents.fillRect(barX, barY, barW, barH, 'rgba(10,10,10,0.6)');
        if (barFill > 0) {
            // Color shifts yellow→red as time runs out
            var barColor = ratio > 0.4 ? 'rgba(80,200,80,0.9)' : 'rgba(220,120,40,0.9)';
            this.contents.fillRect(barX, barY, barFill, barH, barColor);
        }

        // ── Score tally ────────────────────────────────────────────────────
        this.contents.fontSize = 13;
        this.resetTextColor();
        this.drawText(this._hits + ' / ' + this._seqLen + '  hit', 0, barY + 14, cw, 'center');

        this.contents.fontSize = this.standardFontSize();
    };

    //=========================================================================
    // Scene_Battle – host the QTE window
    //=========================================================================

    var _SB_createAllWindows = Scene_Battle.prototype.createAllWindows;
    Scene_Battle.prototype.createAllWindows = function () {
        _SB_createAllWindows.call(this);
        this._sodQTEWindow = new Window_SkillQTE();
        this.addChild(this._sodQTEWindow);
    };

    Scene_Battle.prototype.startSODQTE = function (seqLen) {
        this._sodQTEWindow.start(seqLen);
        this._sodQTEDismiss = -1;
    };

    Scene_Battle.prototype.isSODQTEFinished = function () {
        var win = this._sodQTEWindow;
        if (!win || !win.isFinished()) return false;

        if (this._sodQTEDismiss < 0) {
            this._sodQTEDismiss = 42; // show result ~0.7s
        }
        this._sodQTEDismiss--;
        if (this._sodQTEDismiss <= 0) {
            win.visible = false;
            return true;
        }
        return false;
    };

    Scene_Battle.prototype.getSODQTEResult = function () {
        return this._sodQTEWindow.getResult();
    };

})();
