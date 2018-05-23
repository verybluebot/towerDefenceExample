import Phaser from 'phaser';

export default class NumberBox extends Phaser.Group {
    constructor (game, bgasset, val, parent) {
        super(game, parent);

        // initialize your prefab here
        this.create(0, 0, bgasset);

        const style = { font: '24px Arial', align: 'center', fill: '#fff' };
        this.txtValue = new Phaser.Text(this.game, this.centerX - 3, this.centerY + 3, val.toString(), style);
        this.txtValue.anchor.setTo(0.5);
        this.add(this.txtValue);
    }

    setValue (val) {
        this.txtValue.text = val.toString();
    }
}
