// Snake game with obstacles and powerups - Phaser.js Game

const GRID = 24; // logical grid size (px per cell)
const BOARD_W = 25; // cells
const BOARD_H = 19; // cells

class SnakeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SnakeScene' });
        this.score = 0;
        this.lastMove = 0;
        this.speed = 150; // ms between moves
        this.snake = []; // array of {x,y} grid positions
        this.dir = {x:1,y:0}; // current direction
        this.nextDir = {x:1,y:0}; // buffered input
        this.food = {};
        this.obstacles = [];
        this.powerUps = [];
        this.powerActive = false;
        this.powerTimer = 0;
        this.paused = false;
        this.gameOver = false;
    }

    preload() {
        // create textures programmatically
        const gfx = this.make.graphics({x:0,y:0,add:false});
        // snake head
        gfx.clear().fillStyle(0x00ff00).fillRect(0,0,GRID,GRID);
        gfx.generateTexture('head',GRID,GRID);
        // snake body
        gfx.clear().fillStyle(0x00cc00).fillRect(0,0,GRID,GRID);
        gfx.generateTexture('body',GRID,GRID);
        // food
        gfx.clear().fillStyle(0xff0000).fillCircle(GRID/2,GRID/2,GRID/2);
        gfx.generateTexture('food',GRID,GRID);
        // obstacle
        gfx.clear().fillStyle(0x4444aa).fillRect(0,0,GRID,GRID);
        gfx.generateTexture('obstacle',GRID,GRID);
        // powerup
        gfx.clear().fillStyle(0xffd700).fillStar(GRID/2,GRID/2,5,GRID/2,GRID/4);
        gfx.generateTexture('powerup',GRID,GRID);
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a2e');
        // center board on screen
        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;

        // containers for logical positions
        this.snakeGroup = this.add.group();
        this.obstacleGroup = this.add.group();
        this.powerGroup = this.add.group();

        // borders
        const border = this.add.rectangle(ox-4,oy-4,BOARD_W*GRID+8,BOARD_H*GRID+8).setStrokeStyle(4,0x00d4ff);

        // score text
        this.scoreText = this.add.text(ox, oy-30, 'Score: 0', {fontSize:'20px', fill:'#fff'});

        // reset game state
        this.resetGame();

        // controls
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = this.input.keyboard.addKeys('W,S,A,D');

        // timed obstacle movement
        this.time.addEvent({delay:1200, callback:this.moveObstacles, callbackScope:this, loop:true});
    }

    resetGame() {
        this.snake.forEach(s=>s.image.destroy());
        this.obstacles.forEach(o=>o.image.destroy());
        this.powerUps.forEach(p=>p.image.destroy());
        if(this.foodImage) this.foodImage.destroy();
        this.snake = [];
        this.obstacles = [];
        this.powerUps = [];
        this.score = 0;
        this.dir = {x:1,y:0};
        this.nextDir = {x:1,y:0};
        this.powerActive = false;
        this.powerTimer = 0;
        this.paused = false;
        this.gameOver = false;

        // init snake
        const startX = Math.floor(BOARD_W/2);
        const startY = Math.floor(BOARD_H/2);
        for(let i=0;i<5;i++){
            this.addSegment(startX-i,startY);
        }

        // place food
        this.placeFood();

        // place obstacles
        for(let i=0;i<6;i++) this.placeObstacle();

        // place powerup
        this.placePowerUp();

        this.scoreText.setText('Score: 0');
    }

    addSegment(x,y) {
        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;
        const img = this.add.rectangle(ox + x*GRID + GRID/2, oy + y*GRID + GRID/2, GRID-2, GRID-2, 0x00ff00);
        this.snake.push({x,y,image:img});
    }

    placeFood() {
        do {
            this.food = {
                x: Phaser.Math.Between(0,BOARD_W-1),
                y: Phaser.Math.Between(0,BOARD_H-1)
            };
        } while(this.isOccupied(this.food.x,this.food.y));
        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;
        this.foodImage = this.add.circle(ox + this.food.x*GRID + GRID/2, oy + this.food.y*GRID + GRID/2, GRID/2-2, 0xff0000);
    }

    placeObstacle() {
        let pos;
        do {
            pos = {x:Phaser.Math.Between(0,BOARD_W-1),y:Phaser.Math.Between(0,BOARD_H-1)};
        } while(this.isOccupied(pos.x,pos.y));
        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;
        const img = this.add.rectangle(ox + pos.x*GRID + GRID/2, oy + pos.y*GRID + GRID/2, GRID-4, GRID-4, 0x4444aa);
        this.obstacles.push({x:pos.x,y:pos.y,image:img});
    }

    placePowerUp() {
        if(Math.random()<0.6) return; // chance to not spawn
        let pos;
        do {
            pos = {x:Phaser.Math.Between(0,BOARD_W-1),y:Phaser.Math.Between(0,BOARD_H-1)};
        } while(this.isOccupied(pos.x,pos.y));
        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;
        const img = this.add.star(ox + pos.x*GRID + GRID/2, oy + pos.y*GRID + GRID/2, 5, GRID/3, GRID/2-2, 0xffd700);
        this.powerUps.push({x:pos.x,y:pos.y,image:img});
    }

    isOccupied(x,y) {
        return this.snake.some(s=>s.x===x&&s.y===y) ||
               this.obstacles.some(o=>o.x===x&&o.y===y) ||
               this.powerUps.some(p=>p.x===x&&p.y===y);
    }

    moveObstacles() {
        this.obstacles.forEach(o=>{
            const dir = Phaser.Math.Between(0,3);
            const dx = [0,0,-1,1][dir];
            const dy = [-1,1,0,0][dir];
            const nx = Phaser.Math.Wrap(o.x + dx, 0, BOARD_W);
            const ny = Phaser.Math.Wrap(o.y + dy, 0, BOARD_H);
            if(!this.isOccupied(nx,ny) || (nx===o.x && ny===o.y)){
                o.x = nx; o.y = ny;
                const ox = (this.scale.width - BOARD_W*GRID)/2;
                const oy = (this.scale.height - BOARD_H*GRID)/2;
                o.image.x = ox + nx*GRID + GRID/2;
                o.image.y = oy + ny*GRID + GRID/2;
            }
        });
    }

    update(t,dt) {
        if(this.gameOver) {
            if(this.cursors.space && this.cursors.space.isDown) this.resetGame();
            return;
        }

        // input buffering
        if(this.cursors.left && this.cursors.left.isDown || this.wasd.A && this.wasd.A.isDown) this.nextDir={x:-1,y:0};
        if(this.cursors.right && this.cursors.right.isDown || this.wasd.D && this.wasd.D.isDown) this.nextDir={x:1,y:0};
        if(this.cursors.up && this.cursors.up.isDown || this.wasd.W && this.wasd.W.isDown) this.nextDir={x:0,y:-1};
        if(this.cursors.down && this.cursors.down.isDown || this.wasd.S && this.wasd.S.isDown) this.nextDir={x:0,y:1};

        // prevent reversing into self
        if(this.nextDir.x !== -this.dir.x || this.nextDir.y !== -this.dir.y) {
            this.dir = {x:this.nextDir.x,y:this.nextDir.y};
        }

        // move snake on timer
        if(t > this.lastMove + (this.powerActive?this.speed*0.6:this.speed)) {
            this.lastMove = t;
            this.moveSnake();
        }

        // power timer
        if(this.powerActive) {
            this.powerTimer -= dt;
            if(this.powerTimer <= 0) {
                this.powerActive = false;
                this.cameras.main.setBackgroundColor('#1a1a2e');
            }
        }
    }

    moveSnake() {
        const head = this.snake[0];
        const nx = Phaser.Math.Wrap(head.x + this.dir.x, 0, BOARD_W);
        const ny = Phaser.Math.Wrap(head.y + this.dir.y, 0, BOARD_H);

        // self collision
        if(this.snake.some(s=>s.x===nx&&s.y===ny)) {
            this.endGame();
            return;
        }

        // obstacle collision
        const obs = this.obstacles.find(o=>o.x===nx&&o.y===ny);
        if(obs && !this.powerActive) {
            this.endGame();
            return;
        }

        // powerup collision
        const pow = this.powerUps.findIndex(p=>p.x===nx&&p.y===ny);
        if(pow!==-1) {
            const p = this.powerUps[pow];
            p.image.destroy();
            this.powerUps.splice(pow,1);
            this.powerActive = true;
            this.powerTimer = 5000; // ms
            this.score += 50;
            this.cameras.main.setBackgroundColor('#2a1a3e');
            this.scoreText.setText('Score: ' + this.score);
        }

        // food collision
        let grow = false;
        if(this.food.x===nx&&this.food.y===ny) {
            this.foodImage.destroy();
            this.score += 10;
            this.speed = Math.max(80, this.speed - 2);
            this.placeFood();
            grow = true;
            if(Math.random()<0.4) this.placePowerUp();
        }

        // move head
        if(!grow) {
            const tail = this.snake.pop();
            tail.image.destroy();
        }

        const ox = (this.scale.width - BOARD_W*GRID)/2;
        const oy = (this.scale.height - BOARD_H*GRID)/2;
        const img = this.add.rectangle(ox + nx*GRID + GRID/2, oy + ny*GRID + GRID/2, GRID-2, GRID-2, 0x00ff00);
        this.snake.unshift({x:nx,y:ny,image:img});

        // color body
        this.snake.forEach((s,idx)=>s.image.setFillStyle(idx===0?0x00ff00:0x00cc00));

        this.scoreText.setText('Score: ' + this.score);
    }

    endGame() {
        this.gameOver = true;
        const cx = this.scale.width/2;
        const cy = this.scale.height/2;
        this.add.rectangle(cx,cy,300,120,0x000000,0.8);
        this.add.text(cx,cy-20,'GAME OVER',{fontSize:'32px',fill:'#ff0000'}).setOrigin(0.5);
        this.add.text(cx,cy+20,'Score: '+this.score+'\nPress SPACE to restart',{fontSize:'20px',fill:'#fff',align:'center'}).setOrigin(0.5);
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    scene: SnakeScene
};

// Initialize game
const game = new Phaser.Game(config);