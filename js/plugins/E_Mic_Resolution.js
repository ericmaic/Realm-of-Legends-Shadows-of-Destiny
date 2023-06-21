/*:
 * @plugindesc 改变分辨率/Change the resolution
 * @author: Eric_Mic
 * 
 * @param Screen_width
 * @desc 游戏的屏幕宽度/Screen width
 * 默认值(default): 816
 * @default 816
 * 
 * @param Screen_height
 * @desc 游戏的屏幕高度/Screen height
 * 默认值(default): 624
 * @default 624
 * 
 * @help
 * 改变屏幕分辨率，根据修改的 “Screen_width” 和 “Screen_height”
 * 的值变换屏幕分辨率。
 * Made by Eric Mic 09/22/2020
 * 
 * #分辨率类别/Typs of resolution
 * Default: 960 x 600
 * Type #1: 816 x 624
 * Type #2: 1024 x 768  
 * Type #3: 1280 x 720  
 * Type #4: 1920 x 1080
 * Type #5: 全屏幕
 */

(function(){

    var params = PluginManager.parameters("E_Mic_Resolution");

    var screenWidth = Number(params["Screen_width"]) || 960;
    var screenHeight = Number(params["Screen_height"]) || 600;

    //var _Game_Interpreter_pluginCommand = Game_Interpreter.prototype.pluginCommand;
 
    //给程序赋予一些必要的参数
    //视窗大小，分辨率
    SceneManager._screenWidth = screenWidth;
    SceneManager._screenHeight = screenHeight;
    //盒子大小，窗口大小
    SceneManager._boxWidth = screenWidth;
    SceneManager._boxHeight = screenHeight;

    var newWidth = screenWidth - window.innerWidth;
    var newHeight = screenHeight - window.innerHeight;

    if (Utils.isAndroidChrome()) return;
    //移动和扩展窗口
    window.moveBy(-newWidth / 2, -newHeight / 2);
    window.resizeBy(newWidth, newHeight);

})();