/*:
 * @plugindesc 更改窗口大小
 * @author: Eric_Mic
 * 
 * @param Screen_width
 * @desc 游戏的屏幕宽度
 * 默认值: 816
 * @default 816
 * 
 * @param Screen_height
 * @desc 游戏的屏幕高度
 * 默认值: 624
 * @default 624
 * 
 * @help
 * 插件介绍
 * 
 * 插件命令:
 * ChangeScreenSize 1024 768   #修改游戏屏幕尺寸为1024x768
 */

 /*
* #分辨率类别/Typs of resolution
* Default: 816 x 624 选
* Type #1: 640 x 480
* Type #2: 1024 x 768  选
* Type #3: 1280 x 720  选
* Type #4: 800 x 480
* Type #5: 1920 x 1080  选
* Type #6: 960 x 600  选
*/
Scene_MenuBase.prototype.createBackground = function(){

    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = ImageManager.loadParallax("Pic_1");
    this.addChild(this._backgroundSprite);
}
/*
Scene_Menu.prototype.createBackground = function(){

    this._backgroundSprite = new Sprite();
    this._backgroundSprite.bitmap = ImageManager.loadParallax("Pic_1");
    this.addChild(this._backgroundSprite);
};
*/

/*
Window_MenuCommand.prototype.addOriginalCommands = function () {
    this.addCommand("改名", "rename", true);
};

var _Scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function () {
    _Scene_Menu_createCommandWindow.call(this);

    this._commandWindow.setHandler('rename', this.commandRename.bind(this));
};

Scene_Menu.prototype.commandRename = function () {
    this._statusWindow.setFormationMode(false);
    this._statusWindow.selectLast();
    this._statusWindow.activate();
    this._statusWindow.setHandler('ok',     this.rename_ok.bind(this));
    this._statusWindow.setHandler('cancel', this.rename_cancel.bind(this));
};
Scene_Menu.prototype.rename_ok = function() {
    SceneManager.push(Scene_Name);
    SceneManager.prepareNextScene($gameParty.menuActor()._actorId, 10);
};
Scene_Menu.prototype.rename_cancel = function() {
    this._statusWindow.deselect();
    this._commandWindow.activate();
};

Window_MenuStatus.prototype.processOk = function() {
    $gameParty.setMenuActor($gameParty.members()[this.index()]);
    Window_Selectable.prototype.processOk.call(this);
};
*/