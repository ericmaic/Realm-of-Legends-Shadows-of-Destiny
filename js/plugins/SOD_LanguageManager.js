/*:
 * @plugindesc v1.0 Multi-language support. Adds Language option to title screen
 * and Options menu. Language files live in data/lang/{code}/.
 * @author SOD Team
 *
 * @param Default Language
 * @desc Default language code on first launch: en or zh
 * @default en
 */

(function () {
    'use strict';

    var parameters = PluginManager.parameters('SOD_LanguageManager');
    var defaultLang = String(parameters['Default Language'] || 'en');

    var LANGUAGES = [
        { code: 'en', name: 'English' },
        { code: 'zh', name: '中文' }
    ];

    // ============================================================
    // Helpers
    // ============================================================
    var LM = {};

    LM.currentIndex = function () {
        var lang = ConfigManager.language;
        for (var i = 0; i < LANGUAGES.length; i++) {
            if (LANGUAGES[i].code === lang) return i;
        }
        return 0;
    };

    LM.currentName = function () {
        return LANGUAGES[LM.currentIndex()].name;
    };

    LM.nextLanguage = function () {
        return LANGUAGES[(LM.currentIndex() + 1) % LANGUAGES.length];
    };

    LM.switchTo = function (code) {
        ConfigManager.language = code;
        ConfigManager.save();
        location.reload();
    };

    LM.confirmText = function (next) {
        if (next.code === 'zh') return 'Switch to 中文?  Return to title.';
        return 'Switch to English?  Return to title.';
    };

    // ============================================================
    // ConfigManager – persist language setting
    // ============================================================
    var _CM_makeData = ConfigManager.makeData;
    ConfigManager.makeData = function () {
        var config = _CM_makeData.call(this);
        config.language = this.language;
        return config;
    };

    var _CM_applyData = ConfigManager.applyData;
    ConfigManager.applyData = function (config) {
        _CM_applyData.call(this, config);
        this.language = (config.language !== undefined) ? config.language : defaultLang;
    };

    // Initialise before config is loaded
    ConfigManager.language = defaultLang;

    // ============================================================
    // Plugin text i18n – patches third-party plugin variables
    // ============================================================
    var PLUGIN_TEXTS = {
        'en': {
            picGallery:      'Picture Gallery',
            picCompletion:   'Completion',
            credits:         'Credits',
            questLog:        'Quest Log',
            questActive:     'Active',
            questComplete:   'Complete',
            questFailed:     'Failed',
            questDesc:       'Details',
            questObj:        'Objectives',
            questDiff:       'Level',
            questNoTrack:    'No Quest Selected',
            questCategories: 'Main Quests|#ffcc66,Side Quests|#ffff99,Crafting Quests|#ccccff',
            popQA:  'New Quest:',
            popQC:  'Quest Completed:',
            popQF:  'Quest Failed:',
            popOA:  'New Objective:',
            popOC:  'Objective Completed:',
            popOF:  'Objective Failed:'
        },
        'zh': {
            picGallery:      '图片回廊',
            picCompletion:   '完成度',
            credits:         '制作人员',
            questLog:        '任务日志',
            questActive:     '进行中',
            questComplete:   '已完成',
            questFailed:     '已失败',
            questDesc:       '详情',
            questObj:        '目标',
            questDiff:       '难度',
            questNoTrack:    '无选中任务',
            questCategories: '主线任务|#ffcc66,支线任务|#ffff99,合成任务|#ccccff',
            popQA:  '新任务：',
            popQC:  '任务完成：',
            popQF:  '任务失败：',
            popOA:  '新目标：',
            popOC:  '目标完成：',
            popOF:  '目标失败：'
        }
    };

    LM.applyPluginTexts = function () {
        var lang = ConfigManager.language || defaultLang;
        var t = PLUGIN_TEXTS[lang] || PLUGIN_TEXTS['en'];

        // MOG_PictureGallery
        if (typeof Moghunter !== 'undefined') {
            if (Moghunter.picturegallery_command_name !== undefined)
                Moghunter.picturegallery_command_name = t.picGallery;
            if (Moghunter.picturegallery_completion_word !== undefined)
                Moghunter.picturegallery_completion_word = t.picCompletion;
        }

        // MOG_Credits
        if (typeof Moghunter !== 'undefined' && Moghunter.credits_commandName !== undefined)
            Moghunter.credits_commandName = t.credits;

        // Galv_QuestLog
        if (typeof Galv !== 'undefined' && Galv.QUEST) {
            Galv.QUEST.menuCmd       = t.questLog;
            Galv.QUEST.txtCmdActive  = t.questActive;
            Galv.QUEST.txtCmdComplete= t.questComplete;
            Galv.QUEST.txtCmdFailed  = t.questFailed;
            Galv.QUEST.txtDesc       = t.questDesc;
            Galv.QUEST.txtObj        = t.questObj;
            Galv.QUEST.txtDiff       = t.questDiff;
            Galv.QUEST.txtNoTrack    = t.questNoTrack;
            Galv.QUEST.txtPopQA      = t.popQA;
            Galv.QUEST.txtPopQC      = t.popQC;
            Galv.QUEST.txtPopQF      = t.popQF;
            Galv.QUEST.txtPopOA      = t.popOA;
            Galv.QUEST.txtPopOC      = t.popOC;
            Galv.QUEST.txtPopOF      = t.popOF;
            // Rebuild categories
            Galv.QUEST.categories = [];
            var cats = t.questCategories.split(',');
            for (var i = 0; i < cats.length; i++) {
                var data = cats[i].split('|');
                Galv.QUEST.categories[i] = { id: i, name: data[0], color: data[1] };
            }
        }
    };

    // Apply before Scene_Title and Scene_Menu build their windows
    var _ST_create = Scene_Title.prototype.create;
    Scene_Title.prototype.create = function () {
        LM.applyPluginTexts();
        _ST_create.call(this);
    };

    var _SM_create = Scene_Menu.prototype.create;
    Scene_Menu.prototype.create = function () {
        LM.applyPluginTexts();
        _SM_create.call(this);
    };

    // Files that have language-specific versions under data/lang/{code}/
    var _langFiles = {
        'System.json':  true,
        'Skills.json':  true,
        'Items.json':   true,
        'Weapons.json': true,
        'Armors.json':  true,
        'Enemies.json': true,
        'States.json':  true
        // Add more here as translations are created:
        // 'Actors.json': true, 'Classes.json': true
    };

    // ============================================================
    // DataManager – load from data/lang/{code}/ for known files only
    // ============================================================
    var _DM_loadDataFile = DataManager.loadDataFile;
    DataManager.loadDataFile = function (name, src) {
        if (!_langFiles[src]) {
            _DM_loadDataFile.call(this, name, src);
            return;
        }

        var lang = ConfigManager.language;
        var langUrl = 'data/lang/' + lang + '/' + src;
        var fallUrl = 'data/' + src;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', langUrl);
        xhr.overrideMimeType('application/json');
        xhr.onload = function () {
            var text = xhr.responseText;
            if (text) {
                try {
                    window[name] = JSON.parse(text);
                    DataManager.onLoad(window[name]);
                    return;
                } catch (e) {}
            }
            loadFallback();
        };
        xhr.onerror = loadFallback;
        window[name] = null;
        xhr.send();

        function loadFallback() {
            _DM_loadDataFile.call(DataManager, name, src);
        }
    };

    // ============================================================
    // Window_LanguageConfirm
    // ============================================================
    function Window_LanguageConfirm() {
        this.initialize.apply(this, arguments);
    }

    Window_LanguageConfirm.prototype = Object.create(Window_Command.prototype);
    Window_LanguageConfirm.prototype.constructor = Window_LanguageConfirm;

    Window_LanguageConfirm.prototype.initialize = function () {
        Window_Command.prototype.initialize.call(this, 0, 0);
        this.x = (Graphics.boxWidth  - this.width)  / 2;
        this.y = (Graphics.boxHeight - this.height) / 2;
        this.openness = 0;
        // skip the header item
        this.select(1);
    };

    Window_LanguageConfirm.prototype.windowWidth  = function () { return 400; };
    Window_LanguageConfirm.prototype.numVisibleRows = function () { return 3; };

    Window_LanguageConfirm.prototype.makeCommandList = function () {
        var next = LM.nextLanguage();
        this.addCommand(LM.confirmText(next), 'header', false);
        this.addCommand('Yes', 'yes');
        this.addCommand('No',  'no');
    };

    // ============================================================
    // Title Screen – add Language command
    // ============================================================
    var _WTC_makeCommandList = Window_TitleCommand.prototype.makeCommandList;
    Window_TitleCommand.prototype.makeCommandList = function () {
        _WTC_makeCommandList.call(this);
        this.addCommand('Language: ' + LM.currentName(), 'language');
    };

    var _ST_createCommandWindow = Scene_Title.prototype.createCommandWindow;
    Scene_Title.prototype.createCommandWindow = function () {
        _ST_createCommandWindow.call(this);
        this._commandWindow.setHandler('language', this._onTitleLanguage.bind(this));
    };

    Scene_Title.prototype._onTitleLanguage = function () {
        if (!this._confirmWindow) {
            this._confirmWindow = new Window_LanguageConfirm();
            this._confirmWindow.setHandler('yes', this._onConfirmYes.bind(this));
            this._confirmWindow.setHandler('no',  this._onConfirmNo.bind(this));
            this.addWindow(this._confirmWindow);
        }
        this._confirmWindow.refresh();
        this._confirmWindow.select(1);
        this._confirmWindow.open();
        this._confirmWindow.activate();
        this._commandWindow.deactivate();
    };

    Scene_Title.prototype._onConfirmYes = function () {
        LM.switchTo(LM.nextLanguage().code);
    };

    Scene_Title.prototype._onConfirmNo = function () {
        this._confirmWindow.close();
        this._commandWindow.activate();
    };

    // ============================================================
    // Options Menu – add Language toggle
    // ============================================================
    var _WO_makeCommandList = Window_Options.prototype.makeCommandList;
    Window_Options.prototype.makeCommandList = function () {
        _WO_makeCommandList.call(this);
        this.addCommand('Language: ' + LM.currentName(), 'language');
    };

    var _WO_isVolumeSymbol = Window_Options.prototype.isVolumeSymbol;
    Window_Options.prototype.isVolumeSymbol = function (symbol) {
        if (symbol === 'language') return false;
        return _WO_isVolumeSymbol.call(this, symbol);
    };

    var _WO_getConfigValue = Window_Options.prototype.getConfigValue;
    Window_Options.prototype.getConfigValue = function (symbol) {
        if (symbol === 'language') return LM.currentName();
        return _WO_getConfigValue.call(this, symbol);
    };

    var _WO_setConfigValue = Window_Options.prototype.setConfigValue;
    Window_Options.prototype.setConfigValue = function (symbol, value) {
        if (symbol === 'language') return;
        _WO_setConfigValue.call(this, symbol, value);
    };

    var _WO_processOk = Window_Options.prototype.processOk;
    Window_Options.prototype.processOk = function () {
        if (this.currentSymbol() === 'language') {
            this.deactivate();
            this.callHandler('languageSwitch');
        } else {
            _WO_processOk.call(this);
        }
    };

    var _WO_cursorRight = Window_Options.prototype.cursorRight;
    Window_Options.prototype.cursorRight = function (wrap) {
        if (this.currentSymbol() === 'language') {
            this.deactivate();
            this.callHandler('languageSwitch');
        } else {
            _WO_cursorRight.call(this, wrap);
        }
    };

    var _SO_create = Scene_Options.prototype.create;
    Scene_Options.prototype.create = function () {
        _SO_create.call(this);
        this._optionsWindow.setHandler('languageSwitch', this._onOptionsLanguage.bind(this));
    };

    Scene_Options.prototype._onOptionsLanguage = function () {
        if (!this._confirmWindow) {
            this._confirmWindow = new Window_LanguageConfirm();
            this._confirmWindow.setHandler('yes', this._onConfirmYes.bind(this));
            this._confirmWindow.setHandler('no',  this._onConfirmNo.bind(this));
            this.addWindow(this._confirmWindow);
        }
        this._confirmWindow.refresh();
        this._confirmWindow.select(1);
        this._confirmWindow.open();
        this._confirmWindow.activate();
    };

    Scene_Options.prototype._onConfirmYes = function () {
        LM.switchTo(LM.nextLanguage().code);
    };

    Scene_Options.prototype._onConfirmNo = function () {
        this._confirmWindow.close();
        this._optionsWindow.activate();
    };

})();
