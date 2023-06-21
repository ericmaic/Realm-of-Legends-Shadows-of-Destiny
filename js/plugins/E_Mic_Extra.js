//增加主菜单项目

Window_MenuCommand.prototype.addOriginalCommands = function () {
    this.addCommand("帮助", "help", true);
};

var _scene_Menu_createCommandWindow = Scene_Menu.prototype.createCommandWindow;
Scene_Menu.prototype.createCommandWindow = function(){

    _scene_Menu_createCommandWindow.call(this);

    this._commandWindow.setHandler('help', this.commandTask.bind(this));
}

Scene_Menu.prototype.commandTask = function(){

    console.log("ok fuck u man");
    
}

Scene_Menu.prototype.commandGallery = function(){

    console.log("ok fuck u man");
    
}

//增加主菜单新的窗口
var _scene_Menu_createTips = Scene_Menu.prototype.create;
Scene_Menu.prototype.create = function(){

    _scene_Menu_createTips.call(this);

    this._tipsWindow = new Window_Tips(0, 0);
    //this._tipsWindow.y = this._commandWindow.y + this._commandWindow.height+62;
    this._tipsWindow.y = this._commandWindow.y + this._commandWindow.height;
    this.addWindow(this._tipsWindow);
}

function Window_Tips(){

    this.initialize.apply(this, arguments);
}

Window_Tips.prototype = Object.create(Window_Base.prototype);
Window_Tips.prototype.constructor = Window_Tips;

Window_Tips.prototype.initialize = function(x, y){

    var width = this.windowWidth();
    var height = this.windowHeight();
    Window_Base.prototype.initialize.call(this, 0, 0, width, height);
    this.refresh();
}

Window_Tips.prototype.windowWidth = function(){

    return 240;
}

Window_Tips.prototype.windowHeight = function(){

    return this.fittingHeight(1);
}

Window_Tips.prototype.refresh = function(){

    var x = this.textPadding();
    var width = this.contentWidth - this.textPadding() * 2;
    this.contents.clear();

    this.draw_time_contents();
    //this.drawIcon(79, 6, 0);
    //this.contents.drawText($gameSystem.playtimeText(), 0,  6, 90,32,"right");
    
}

Window_Tips.prototype.draw_time_contents = function(){

	   //this.contents.drawText("游戏时间:", 0, y * 6, 90,32);
	   //this.contents.drawText($gameSystem.playtimeText(), x, y * 6, 90,32,"right");
        //this.drawIcon(79, 6, 0);
        this.contents.drawText("游戏时间:", 9, 6, 90,28);
        this.contents.drawText($gameSystem.playtimeText(), 107, 6, 90,28,"right");
}

Window_Tips.prototype.open = function(){

    this.refresh();
    Window_Base.prototype.open.call(this);
}
