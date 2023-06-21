//=============================================================================
// Chimaki_MessageTool.js
// Version: 1.0
//=============================================================================
/*:
* @plugindesc 對話視窗工具
* @author Maker製造機 Chimaki 
* 
* 
* @help 
* 作者網站：Maker製造機 www.chiamkier.com
* 1.0 提供文字對話內容單句置中, 不支援多行文字
* 
* 插件指令 : 
* Text Center : 文字自動左右置中 (一次性效果)
* 
*/


"use strict"; // es mode

var Imported = Imported || {};
var chimaki_plugin = chimaki_plugin || {};
chimaki_plugin.msgtool = {};
chimaki_plugin.alias = {};


(function(){
    chimaki_plugin.msgtool._lastIndexOf = document.currentScript.src.lastIndexOf( '/' );
    chimaki_plugin.msgtool._indexOf            = document.currentScript.src.indexOf( '.js' );
    chimaki_plugin.msgtool._getJSName          = document.currentScript.src.substring( chimaki_plugin.msgtool._lastIndexOf + 1, chimaki_plugin.msgtool._indexOf );

    let isNeedCenter = false;
    chimaki_plugin.alias._plugin_command = Game_Interpreter.prototype.pluginCommand;
    Game_Interpreter.prototype.pluginCommand = function(command, args) {
        chimaki_plugin.alias._plugin_command.call(this, command, args);
        if (command === 'Text') {
            switch (args[0]){
                case 'Center':
                    isNeedCenter = true;
                    break;
            }           
        }
    }
//=============================================================================
// 對話控制
//=============================================================================
    chimaki_plugin.alias._windowmsg_center = Window_Message.prototype.newPage;
    Window_Message.prototype.newPage = function(textState) {
        chimaki_plugin.alias._windowmsg_center.call(this, textState);
        if (this.isNeedCenter()) {
            //textState.x = this.width / 2 - this.textWidth(this._textState.text) / 2 - this.standardPadding();
            textState.x = this.width / 2 - this.textWidth(this._textState.text) / 2 + this.standardPadding() + 10;
    
            textState.y = (this.height / 2) - (this._textState.height / 2) -  this._textState.height / 2 ;            
            isNeedCenter = false;
        }  
    };
    Window_Message.prototype.isNeedCenter = function (){
        return isNeedCenter;
    }



})();