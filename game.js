/* global Phaser, COIN_DASH */
class CoinDash extends Phaser.Scene {
  constructor() { super('CoinDash'); }

  create() {
    const c = COIN_DASH;
    this.score = 0;
    this.finished = false;
    this.paused = false;
    this.deadline = this.time.now + c.roundSeconds * 1000;
    this.physics.world.setBounds(0, 44, c.width, c.height - 44);
    this.add.grid(c.width / 2, c.height / 2, c.width, c.height, 40, 40,
      c.colors.background, 1, 0x24334b, 0.45);
    this.hud = this.add.text(18, 12, '', { font: '18px monospace', color: '#ffffff' });
    this.player = this.add.rectangle(c.width / 2, c.height / 2, 24, 24, c.colors.player);
    this.physics.add.existing(this.player);
    this.player.body.setCollideWorldBounds(true);
    this.coin = this.add.circle(100, 100, 9, c.colors.coin);
    this.physics.add.existing(this.coin);
    this.coin.body.setCircle(9);
    this.obstacles = this.physics.add.staticGroup();
    this.placeCoin();
    this.drones = this.physics.add.group();
    for (let i = 0; i < c.droneCount; i++) {
      const drone = this.add.rectangle(90 + i * 270, 100, 26, 26, c.colors.drone);
      this.drones.add(drone);
      drone.body.setCollideWorldBounds(true).setBounce(1, 1);
      const angle = (35 + i * 105) * Math.PI / 180;
      drone.body.setVelocity(Math.cos(angle) * c.droneSpeed, Math.sin(angle) * c.droneSpeed);
    }
    this.physics.add.overlap(this.player, this.coin, () => {
      if (this.finished) return;
      this.score++;
      window.CoinDashAudio.play('coin');
      this.placeCoin();
      this.addObstacle();
    });
    // Obstacles are solid walls: they block the player and drones bounce off them.
    this.physics.add.collider(this.player, this.obstacles);
    this.physics.add.collider(this.drones, this.obstacles);
    this.physics.add.overlap(this.player, this.drones, () => this.finish('A drone caught you!', false));
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,R');
    this.input.keyboard.on('keydown-R', () => this.scene.restart());
    this.input.keyboard.on('keydown-P', () => this.togglePause());
  }

  placeCoin() {
    const c = COIN_DASH;
    // Avoid spawning the next coin directly underneath the player.
    let x, y;
    do {
      x = Phaser.Math.Between(25, c.width - 25);
      y = Phaser.Math.Between(70, c.height - 25);
    } while (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 60
      || this.nearObstacle(x, y, c.obstacleSize + 10));
    this.coin.setPosition(x, y);
    this.coin.body.reset(x, y);
  }

  nearObstacle(x, y, distance) {
    return this.obstacles.getChildren().some(
      (o) => Phaser.Math.Distance.Between(x, y, o.x, o.y) < distance);
  }

  addObstacle() {
    const c = COIN_DASH;
    if (this.obstacles.getLength() >= c.maxObstacles) return;
    const edge = c.obstacleSize / 2 + 30;
    // Keep new obstacles clear of the player, the coin, the drones, each other and the
    // walls, leaving gaps wide enough for the player and drones to pass through.
    for (let attempt = 0; attempt < 50; attempt++) {
      const x = Phaser.Math.Between(edge, c.width - edge);
      const y = Phaser.Math.Between(44 + edge, c.height - edge);
      const clear = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) > 90
        && Phaser.Math.Distance.Between(x, y, this.coin.x, this.coin.y) > c.obstacleSize + 10
        && this.drones.getChildren().every(
          (d) => Phaser.Math.Distance.Between(x, y, d.x, d.y) > 70)
        && !this.nearObstacle(x, y, c.obstacleSize * 2);
      if (!clear) continue;
      const obstacle = this.add.rectangle(x, y, c.obstacleSize, c.obstacleSize, c.colors.obstacle);
      this.obstacles.add(obstacle);
      return;
    }
  }

  update() {
    if (this.finished || this.paused) return;
    const dx = Number(this.cursors.right.isDown || this.keys.D.isDown)
      - Number(this.cursors.left.isDown || this.keys.A.isDown);
    const dy = Number(this.cursors.down.isDown || this.keys.S.isDown)
      - Number(this.cursors.up.isDown || this.keys.W.isDown);
    const direction = new Phaser.Math.Vector2(dx, dy).normalize().scale(COIN_DASH.playerSpeed);
    this.player.body.setVelocity(direction.x, direction.y);
    const seconds = Math.max(0, Math.ceil((this.deadline - this.time.now) / 1000));
    this.hud.setText(`Coins: ${this.score}                       Time: ${seconds}s`);
    if (seconds === 0) this.finish('You win! Time is up!', true);
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.pausedAt = this.time.now;
      this.physics.pause();
      const c = COIN_DASH;
      this.pauseOverlay = this.add.container(0, 0, [
        this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95),
        this.add.text(c.width / 2, c.height / 2, 'Paused — press P to resume',
          { font: '24px monospace', color: '#ffffff', align: 'center' }).setOrigin(0.5)
      ]);
    } else {
      // Push the deadline back so paused time does not count against the round.
      this.deadline += this.time.now - this.pausedAt;
      this.physics.resume();
      this.pauseOverlay.destroy();
    }
  }

  finish(reason, won = false) {
    if (this.finished) return;
    this.finished = true;
    window.CoinDashAudio.play(won ? 'win' : 'lose');
    this.physics.pause();
    const c = COIN_DASH;
    this.add.rectangle(c.width / 2, c.height / 2, 460, 150, 0x0a1120, 0.95);
    this.add.text(c.width / 2, c.height / 2,
      `${reason}\n${this.score} coins collected\nPress R to try again`,
      { font: '24px monospace', color: '#ffffff', align: 'center', lineSpacing: 12 }
    ).setOrigin(0.5);
  }
}
window.coinDashGame = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: COIN_DASH.width,
  height: COIN_DASH.height,
  backgroundColor: COIN_DASH.colors.background,
  physics: { default: 'arcade', arcade: { debug: false } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_HORIZONTALLY },
  scene: CoinDash
});
