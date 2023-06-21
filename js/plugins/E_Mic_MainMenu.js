/*:
 * @plugindesc 增加主菜单选项图标，增加修改主菜单选项
 * @author: Eric_Mic
 * 
 */

//增加主菜单图标
var iconIndex = [249, 254, 250, 253, 284, 283, 282, 251, 247, 252];

Window_MenuCommand.prototype.drawItem = function(index){

    var rect = this.itemRectForText(index);
    var align = this.itemTextAlign();
    this.resetTextColor();
    this.changePaintOpacity(this.isCommandEnabled(index));
    this.drawIcon(iconIndex[index],rect.x, rect.y);
    //this.drawText(this.commandName(index),rect.x + 46,rect.y, rect.width - 46, align);
    this.drawText(this.commandName(index),rect.x + 46,rect.y, rect.width - 46, align);

}


//增加任务栏标题
/*
var _scene_Task = Scene_Menu.prototype.create;
Scene_Menu.prototype.create = function(){

    _scene_Task.call(this);
    this._taskWindow = new Window_TaskCommand(0,0);
    this._taskWindow.y = this._commandWindow.y + this._commandWindow.height;
    this.addWindow(this._taskWindow);
}

function Window_TaskCommand() {
    this.initialize.apply(this, arguments);
}

Window_TaskCommand.prototype = Object.create(Window_Command.prototype);
Window_TaskCommand.prototype.constructor = Window_TaskCommand;

Window_TaskCommand.prototype.initialize = function(x, y) {
    Window_Command.prototype.initialize.call(this, x, y);
    this.selectLast();
};

Window_TaskCommand._lastCommandSymbol = null;

Window_TaskCommand.initCommandPosition = function() {
    this._lastCommandSymbol = null;
};

Window_TaskCommand.prototype.windowWidth = function() {
    return 240;
};

Window_TaskCommand.prototype.numVisibleRows = function() {
    return this.maxItems();
};

Window_TaskCommand.prototype.makeCommandList = function() {
    
    this.addOriginalCommands();
};

Window_TaskCommand.prototype.addOriginalCommands = function() {
    
    this.addCommand("任务", "task", true);
};

Window_TaskCommand.prototype.processOk = function() {
    Window_TaskCommand._lastCommandSymbol = this.currentSymbol();
    Window_Command.prototype.processOk.call(this);
};

Window_TaskCommand.prototype.selectLast = function() {
    this.selectSymbol(Window_TaskCommand._lastCommandSymbol);
};

Window_TaskCommand.prototype.drawItem = function(){

    this.drawIcon(193, 6, 0);
    this.drawTextEx("当前任务", 50, 0);
}
*/

