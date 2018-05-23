import Phaser from 'phaser';

import EasyStar from 'easystarjs';

// plugins - this was the only way to work for some reason
import 'phaser-plugin-isometric';

// UI sprites
import { NumberBox } from '../sprites/UI';

// GoodGuys
import { Archer } from '../sprites/GoodGuys';

// Enemies
import { Skeleton } from '../sprites/Enemies';

export default class Game extends Phaser.State {
    create () {
        this.spawnTime = 1000;

        this.mapData = this.game.cache.getJSON('mapdata');

        this.playerLife = 10;
        this.money = 100;

        this.game.physics.startSystem(Phaser.Physics.ARCADE);

        this.game.time.advancedTiming = true;

        // set background
        this.bg = this.game.add.sprite(0, 0, 'gamebg');
        this.bg.width = this.game.width;
        this.bg.height = this.game.height;

        // Add and enable the plug-in.
        this.game.plugins.add(Phaser.Plugin.Isometric);

        // This is used to set a game canvas-based offset for the 0, 0, 0 isometric coordinate - by default
        // this point would be at screen coordinates 0, 0 (top left) which is usually undesirable.
        this.game.iso.anchor.setTo(0.5, 0.4);

        // Create a group for our tiles.
        this.isoGroup = this.game.add.group();
        this.isoChars = this.game.add.group();

        // Let's make a load of tiles on a grid.
        this.spawnTiles();

        this.allies = this.game.add.group(this.isoChars);
        this.enemies = this.game.add.group(this.isoChars);
        this.enemies.findNearest = this.findNearest;
        this.arrows = this.game.add.group();
        this.arrows.enableBody = true;
        this.arrows.physicsBodyType = Phaser.Physics.ARCADE;
        // this.arrows.createMultiple(30, 'arrow');

        // Provide a 3D position for the cursor
        this.cursorPos = new Phaser.Plugin.Isometric.Point3();

        // setup the pathfinding
        this.easystar = new EasyStar.js();
        this.easystar.setGrid(this.mapData.tileMap);
        this.easystar.setAcceptableTiles([1]);

        this.boundFound = this.pathFound.bind(this);
        this.easystar.findPath(1, 0, 0, 4, this.boundFound);

        this.scoreBox = new NumberBox(this.game, 'moneyholder', this.money);
        this.scoreBox.x = 50;
        this.scoreBox.y = 50;
        this.add.existing(this.scoreBox);

        this.healthBox = new NumberBox(this.game, 'healthholder', this.playerLife);
        this.healthBox.x = this.scoreBox.width + 50;
        this.healthBox.y = 50;
        this.add.existing(this.healthBox);

        this.nextSpawn = this.game.time.now + this.spawnTime;
    }

    update () {
        // It's important to understand that screen-to-isometric projection means you have to specify a z position manually, as this cannot be easily
        // determined from the 2D pointer position without extra trickery. By default, the z position is 0 if not set.
        this.game.iso.unproject(this.game.input.activePointer.position, this.cursorPos);

        // Loop through all tiles and test to see if the 3D position from above intersects with the automatically generated IsoSprite tile bounds.
        this.isoGroup.forEach(this.checkTiles, this, false);

        if (this.game.input.activePointer.isDown && this.selectedTile) {
            if (!this.selectedTile.occupant && this.selectedTile.buyable) {
                if (this.money >= 100) {
                    const human = new Archer(this.game, this.selectedTile.isoX, this.selectedTile.isoY, this.enemies, this.arrows);
                    this.allies.add(human);
                    this.selectedTile.occupant = human;
                    this.money -= 100;
                    this.scoreBox.setValue(this.money);
                }
            }
        }

        this.game.physics.arcade.overlap(this.arrows, this.enemies, this.arrowHitEnemy, null, this);

        if (this.game.time.now > this.nextSpawn) {
            this.spawnEnemy();
            this.nextSpawn = this.game.time.now + this.spawnTime;
        }

        this.easystar.calculate();
        this.game.iso.simpleSort(this.enemies);
    }

    arrowHitEnemy (arrow, enemy) {
        arrow.kill();
        enemy.damage(1);
        if (!enemy.alive) {
            this.money += enemy.worth;
            this.scoreBox.setValue(this.money);
        }
    }

    checkTiles (tile) {
        const inBounds = tile.isoBounds.containsXY(this.cursorPos.x, this.cursorPos.y);
        // If it does, do a little animation and tint change.
        if (!tile.selected && inBounds) {
            tile.selected = true;
            tile.tint = 0x86bfda;
            this.game.add.tween(tile).to({ isoZ: 4 }, 200, Phaser.Easing.Quadratic.InOut, true);

            this.selectedTile = tile;
        }

        // If not, revert back to how it was.
        else if (tile.selected && !inBounds) {
            tile.selected = false;
            tile.tint = 0xffffff;
            this.game.add.tween(tile).to({ isoZ: 0 }, 200, Phaser.Easing.Quadratic.InOut, true);
        }
    }

    spawnTiles () {
        const size = 55;
        const mapWidth = this.mapData.tileMap[0].length - 1;
        const mapHeight = this.mapData.tileMap.length - 1;

        this.gameTiles = [];

        // const i = 0;
        let tile = {};
        // const cc = 5;
        for (let y = 0; y <= mapHeight; y++) {
            this.gameTiles[ y ] = [];
            for (let x = 0; x <= mapWidth; x++) {
                const tileNumber = this.mapData.tileMap[y][ x ];
                const tileName = this.mapData.tileNames[tileNumber];

                tile = this.game.add.isoSprite(x * size, y * size, 0, tileName, 0, this.isoGroup);
                tile.anchor.set(0.5, 0);
                tile.buyable = tileNumber === 0;

                this.gameTiles[y][x] = tile;
            }
        }
    }

    pathFound (path) {
        if (path === null) {
            console.log('Path was not found.');
        } else {
            console.log('Path was found. The first Point is ' + path[0].x + ' ' + path[0].y);

            this.convertedPath = [];
            let curPoint;
            for (let i = 0; i < path.length; i++) {
                curPoint = this.gameTiles[path[i].y][path[i].x];
                this.convertedPath.push({ x: curPoint.isoX, y: curPoint.isoY });
            }
        }
    }

    enemyAtGoal (enemy) {
        enemy.kill();
        this.playerLife--;
        this.healthBox.setValue(this.playerLife);

        if (this.playerLife <= 0) {
            this.gameOver();
        }
    }

    spawnEnemy () {
        const skel = new Skeleton(this.game, this.convertedPath[0].x, this.convertedPath[0].y);
        skel.setPath(this.convertedPath);
        skel.advanceTile();
        skel.pathFinished.addOnce(this.enemyAtGoal, this);
        this.enemies.add(skel);
    }

    gameOver () {
        this.game.state.start('gameover');
    }

    findNearest (xc, yc) {
        let lowestChild = null;
        let lowestDist = null;

        this.forEach(child => {
            const dist = Phaser.Math.distance(xc, yc, child.x, child.y);

            if (!lowestChild) {
                lowestChild = child;
            } else {
                if (dist < lowestDist) {
                    lowestChild = child;
                    lowestDist = dist;
                }
            }
        }, this, true);

        return lowestChild;
    }
}
