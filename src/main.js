import 'pixi';
import 'p2';
import Phaser from 'phaser';

import BootState from './states/Boot';
import SplashState from './states/Splash';
import GameState from './states/Game';
import Menu from './states/Menu';
import GameOver from './states/GameOver';

// import config from './config';

class Game extends Phaser.Game {
    constructor () {
        // const docElement = document.documentElement;
        let width = window.innerWidth * window.devicePixelRatio;
        let height = window.innerHeight * window.devicePixelRatio;

        super(width, height, Phaser.AUTO, 'content', null);

        this.state.add('Boot', BootState, false);
        this.state.add('Splash', SplashState, false);
        this.state.add('Menu', Menu, false);
        this.state.add('Game', GameState, false);
        this.state.add('GameOver', GameOver, false);

        // with Cordova with need to wait that the device is ready so we will call the Boot state in another file
        if (!window.cordova) {
            this.state.start('Boot');
        }
    }
}

window.game = new Game();

if (window.cordova) {
    const app = {
        initialize: function () {
            document.addEventListener(
                'deviceready',
                this.onDeviceReady.bind(this),
                false
            );
        },

        // deviceready Event Handler
        //
        onDeviceReady: function () {
            this.receivedEvent('deviceready');

            // When the device is ready, start Phaser Boot state.
            window.game.state.start('Boot');
        },

        receivedEvent: function (id) {
            console.log('Received Event: ' + id);
        }
    };

    app.initialize();
}
