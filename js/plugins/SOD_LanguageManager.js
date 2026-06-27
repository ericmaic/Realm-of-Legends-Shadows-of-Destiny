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
        DataManager.loadDatabase();
        SceneManager.goto(Scene_Title);
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
    // DataManager – load from data/lang/{code}/ with fallback
    // ============================================================
    var _DM_loadDataFile = DataManager.loadDataFile;
    DataManager.loadDataFile = function (name, src) {
        var lang = ConfigManager.language;
        var langUrl  = 'data/lang/' + lang + '/' + src;
        var fallUrl  = 'data/' + src;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', langUrl);
        xhr.overrideMimeType('application/json');
        xhr.onload = function () {
            if (xhr.status < 400) {
                window[name] = JSON.parse(xhr.responseText);
                DataManager.onLoad(window[name]);
            } else {
                loadFallback();
            }
        };
        xhr.onerror = loadFallback;
        window[name] = null;
        xhr.send();

        function loadFallback() {
            var xhr2 = new XMLHttpRequest();
            xhr2.open('GET', fallUrl);
            xhr2.overrideMimeType('application/json');
            xhr2.onload = function () {
                if (xhr2.status < 400) {
                    window[name] = JSON.parse(xhr2.responseText);
                    DataManager.onLoad(window[name]);
                } else {
                    DataManager._errorUrl = DataManager._errorUrl || fallUrl;
                }
            };
            xhr2.onerror = function () {
                DataManager._errorUrl = DataManager._errorUrl || fallUrl;
            };
            xhr2.send();
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
