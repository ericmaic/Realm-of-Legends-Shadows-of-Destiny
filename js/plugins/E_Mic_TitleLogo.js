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
