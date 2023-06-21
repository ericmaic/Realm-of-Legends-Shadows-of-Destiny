
/*功能：
 *写入标题logo
 *
 */
//重写scene title，改变标题页的游戏名字, 游戏logo显示
Scene_Title.prototype.createForeground = function() {
    if ($dataSystem.optDrawTitle) {
        
        var gameLogo = ImageManager.loadBitmap("img/mytitle/", "lsp2");
        this._gameTitleSprite = new Sprite(gameLogo);
        this._gameTitleSprite.anchor = new Point(0.5, 0);
        this._gameTitleSprite.x = Graphics.width / 2;
        this._gameTitleSprite.y = 50;
        this.addChild(this._gameTitleSprite);
    }
};

/*功能：
 *标题页按钮功能添加，自定义额外功能的按钮
 *
 */
//标题页背景图片实现动画效果
//var _window_TitleCommand_make

//标题页菜单
/*
var _window_TitleCommand_makeCommandList = Window_TitleCommand.prototype.makeCommandList;

Window_TitleCommand.prototype.makeCommandList = function(){

    _window_TitleCommand_makeCommandList.call(this);

    this.addCommand("官方网站", 'click');
    this.addCommand("特别致谢",'dog');
    this.addCommand("退出游戏",'exit');
};

var _scene_Title_createCommandWindow = Scene_Title.prototype.createCommandWindow;
Scene_Title.prototype.createCommandWindow = function(){

    _scene_Title_createCommandWindow.call(this);

    //this._commandWindow.opacity = 0;

    this._commandWindow.setHandler('click', this.commandClick.bind(this));
}

Scene_Title.prototype.commandClick = function() {

    this._commandWindow.activate();

    var cmd;
    if(process.platform == 'darwin') cmd = 'open';
    if(process.platform == 'win32') cmd = 'explorer.exe';
    if(process.platform == 'linux') cmd = 'xdg-open';
    
    var spawn = require('child_process').spawn;
    spawn(cmd, ["http://www.baidu.com"]);
}
*/

/*功能：
 *添加自定义的按钮模式，自定义的按钮
 *
 */
var _scene_Title_create = Scene_Title.prototype.create;
Scene_Title.prototype.create = function(){

    _scene_Title_create.call(this);
    this._commandWindow.visible = false;
    this._commandWindow.x = Graphics.width;
    
    var btnimgs = ["titile_new_start","titile_new_save","titile_new_set"];
    /*
    var clicks = [function(){this.commandNewGame(); SoundManager.playOk();},
                  function(){this.commandContinue(); SoundManager.playOk();},
                  function(){this.commandOptions(); SoundManager.playOk();}
    ];
    */

    var clicks=[
        function(){if(this._commandWindow.index()!=0){this._commandWindow.select(0);}else{this._commandWindow.processOk();}; SoundManager.playOk();},
        function(){if(this._commandWindow.index()!=1){this._commandWindow.select(1);}else{this._commandWindow.processOk();}; SoundManager.playOk();},
        function(){if(this._commandWindow.index()!=2){this._commandWindow.select(2);}else{this._commandWindow.processOk();}; SoundManager.playOk();}
        //function(){if(this._commandWindow.index()!=3){this._commandWindow.select(3);}else{this._commandWindow.processOk();} SoundManager.playOk();}
        ];
    /*
    var clicks=[
        function(){ this._commandWindow.select(0); this._commandWindow.processOk(); },
        function(){ this._commandWindow.select(1); this._commandWindow.processOk(); },
        function(){ this._commandWindow.select(2); this._commandWindow.processOk(); }
        //function(){ this._commandWindow.select(3); this._commandWindow.processOk(); }
    ]
    */

    this._cmdButtons = [];
    for(var i in btnimgs){

        var sprite = new Sprite_Button();
        sprite.width = 184;
        sprite.height = 53;
        sprite.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[i]);

        sprite.x = Graphics.width/2 - 100;
        sprite.y = 400 + 56*i;
        sprite.setClickHandler(clicks[i].bind(this));
        this._cmdButtons.push(sprite);
        this.addChild(sprite);
    }
    this._cmdSelect=new Sprite(ImageManager.loadBitmap("img/mytitle/", "titile_new_point"));//选中菜单的指示器
    this._cmdSelect.anchor=new Point(1.1,0);//因为按钮的anchor是默认的(0,0),这个指示器要放在按钮左侧，所以让它的anchor为(1,0)更容易定位
    this.addChild(this._cmdSelect);
};

var _scene_Title_update = Scene_Title.prototype.update;
Scene_Title.prototype.update = function() {

    _scene_Title_update.call(this);

    var btnSelect = this._cmdButtons[this._commandWindow.index()];
    this._cmdSelect.x = btnSelect.x;
    this._cmdSelect.y = btnSelect.y;
    //this._cmdSelect.x -= 10;
    //this._cmdSelect.x -= 10;
};

/*功能：
 *实现指针指向标题图片时候，鼠标悬停按钮图片切换
 *
 */

var _TouchInput_onMouseMove = TouchInput._onMouseMove;

TouchInput._onMouseMove = function (e) {
    
    _TouchInput_onMouseMove.call(this, e);

    if(!(SceneManager._scene instanceof Scene_Title)) return; //检测当前场景是否为Scene_Title，如果不是直接退出
    var cmdButtons = SceneManager._scene._cmdButtons; //获得Scene_Title中的_cmdButtons，也就是我们自定义的菜单按钮
    var mousex = Graphics.pageToCanvasX(e.pageX); //获取鼠标在画板上的x坐标
    var mousey = Graphics.pageToCanvasY(e.pageY); //获取鼠标在画板上的y坐标
    //这里以第一个按钮为例（如果你要处理所有按钮，用比如forEach遍列去处理）
    var btnimgs = ["titile_new_start","titile_new_save","titile_new_set","turn_titile_new_start","turn_titile_new_save","turn_titile_new_set"];
    
    
    var button = cmdButtons[0]; //只拿一个按钮做示例
    var button2 = cmdButtons[1];
    var button3 = cmdButtons[2];
    
    if(mousex>=button.x && mousex<=button.x+button.width && mousey>=button.y && mousey<=button.y+button.height)//检测当前的鼠标坐标是否处在按钮范围内
    {//鼠标悬浮在按钮上
        button.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[3]); //将按钮的图片设置为鼠标悬浮状态的图片
        
    }else{//鼠标移出按钮范围
        button.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[0]); //按钮钮的图片设置为正常图片
    }
    //SoundManager.playOk();
    
    if(mousex>=button2.x && mousex<=button2.x+button2.width && mousey>=button2.y && mousey<=button2.y+button2.height)//检测当前的鼠标坐标是否处在按钮范围内
    {//鼠标悬浮在按钮上
        button2.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[4]); //将按钮的图片设置为鼠标悬浮状态的图片
    }else{//鼠标移出按钮范围
        button2.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[1]); //按钮钮的图片设置为正常图片
    }

    if(mousex>=button3.x && mousex<=button3.x+button3.width && mousey>=button3.y && mousey<=button3.y+button3.height)//检测当前的鼠标坐标是否处在按钮范围内
    {//鼠标悬浮在按钮上
        button3.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[5]); //将按钮的图片设置为鼠标悬浮状态的图片
    }else{//鼠标移出按钮范围
        button3.bitmap = ImageManager.loadBitmap("img/mytitle/", btnimgs[2]); //按钮钮的图片设置为正常图片
    }
    
}