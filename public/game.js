const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const speedElement = document.getElementById('speed');
const startButton = document.getElementById('startButton');
const leaderboardElement = document.getElementById('leaderboard');

// параметры
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 9;
const BRICK_WIDTH = 75;
const BRICK_HEIGHT = 20;
const BRICK_PADDING = 10;
const BRICK_OFFSET_TOP = 60;
const BRICK_OFFSET_LEFT = 30;

let score = 0;
let lives = 3;
let gameStartTime;
let gameOver = false;
let gameWin = false;
let gameStarted = false;

// текстуры
const textures = {
    red: new Image(),
    white: new Image(),
    paddle: new Image(),
    ball: new Image()
};

textures.red.src = 'assets/red.jpg';
textures.white.src = 'assets/white.jpg';
textures.paddle.src = 'assets/paddle.jpg';
textures.ball.src = 'assets/fireball-pixel.gif';

// Игровые обьекты
const ball = {
    x: canvas.width / 2,
    y: canvas.height - 30,
    radius: 10,
    speedX: 5,
    speedY: -5,
    launched: false,

    reset() {
        this.x = canvas.width / 2;
        this.y = canvas.height - 30;
        this.speedX = 5;
        this.speedY = -5;
        this.launched = false;
    },

    draw() {
        if (textures.ball.complete) {
            ctx.drawImage(
                textures.ball,
                this.x - this.radius,
                this.y - this.radius * 2,
                this.radius * 3,
                this.radius * 3
            );
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = '#FF5252';
            ctx.fill();
            ctx.closePath();
        }
    },

    update() {
        this.x += this.speedX;
        this.y += this.speedY;

        // Столкновение со стеной
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.speedX *= -1;
        }

        if (this.y - this.radius < 0) {
            this.speedY *= -1;
        }
    },

    getSpeed() {
        return Math.sqrt(this.speedX * this.speedX + this.speedY * this.speedY).toFixed(1);
    }
};

const paddle = {
    width: 100,
    height: 15,
    x: canvas.width / 2 - 50,
    y: canvas.height - 20,

    draw() {
        if (textures.paddle.complete) {
            ctx.drawImage(textures.paddle, this.x, this.y, this.width, this.height);
        } else {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = '#3498db';
            ctx.fill();
            ctx.closePath();
        }
    }
};

// создание блоков
const bricks = [];
for (let r = 0; r < BRICK_ROW_COUNT; r++) {
    bricks[r] = [];
    for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
        const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
        const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
        const isRed = (r + c) % 3 === 0;

        bricks[r][c] = {
            x: brickX,
            y: brickY,
            width: BRICK_WIDTH,
            height: BRICK_HEIGHT,
            active: true,
            isRed,
            wasHit: false,

            draw() {
                if (!this.active) return;

                let texture;
                if (this.isRed && !this.wasHit) {
                    texture = textures.red;
                } else {
                    texture = textures.white;
                }

                if (texture.complete) {
                    ctx.drawImage(texture, this.x, this.y, this.width, this.height);
                } else {
                    ctx.beginPath();
                    ctx.rect(this.x, this.y, this.width, this.height);
                    ctx.fillStyle = this.wasHit ? '#2ecc71' : (this.isRed ? '#e74c3c' : '#ecf0f1');
                    ctx.fill();
                    ctx.closePath();
                }

                ctx.strokeStyle = '#34495e';
                ctx.strokeRect(this.x, this.y, this.width, this.height);
            }
        };
    }
}

// Leaderboard
const leaderboard = {
    records: [],
    loading: false,

    async load() {
        this.loading = true;
        try {
            const response = await fetch('/api/records');
            this.records = await response.json();
            this.updateUI();
        } catch (error) {
            console.error('Error loading records:', error);
        } finally {
            this.loading = false;
        }
    },

    async addRecord(name, score, time) {
        this.loading = true;
        try {
            const response = await fetch('/api/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, score, time }),
            });
            const newRecord = await response.json();
            this.records.push(newRecord);
            this.records.sort((a, b) => a.time - b.time);
            this.updateUI();
        } catch (error) {
            console.error('Error saving record:', error);
        } finally {
            this.loading = false;
        }
    },

    updateUI() {
        leaderboardElement.innerHTML = `
            <h3>Top Scores</h3>
            <ol>
                ${this.records.slice(0, 5).map(record => `
                    <li>${record.name}: ${record.score} (${formatTime(record.time)})</li>
                `).join('')}
            </ol>
        `;
    }
};

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

startButton.addEventListener('click', startGame);

canvas.addEventListener('mousemove', (e) => {
    if (!gameStarted) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    paddle.x = Math.max(0, Math.min(mouseX - paddle.width / 2, canvas.width - paddle.width));

    if (!ball.launched) {
        ball.x = paddle.x + paddle.width / 2;
    }
});

canvas.addEventListener('click', () => {
    if (gameStarted && !ball.launched) {
        ball.launched = true;
    }
});

function startGame() {
    gameStarted = true;
    gameOver = false;
    gameWin = false;
    score = 0;
    lives = 3;
    ball.reset();
    paddle.x = canvas.width / 2 - paddle.width / 2;
    gameStartTime = Date.now();

    // обновить блоки
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            bricks[r][c].active = true;
            bricks[r][c].wasHit = false;
        }
    }

    startButton.style.display = 'none';
    update();
}

function collisionDetection() {
    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            const brick = bricks[r][c];

            if (brick.active) {
                if (
                    ball.x + ball.radius > brick.x &&
                    ball.x - ball.radius < brick.x + brick.width &&
                    ball.y + ball.radius > brick.y &&
                    ball.y - ball.radius < brick.y + brick.height
                ) {
                    ball.speedY *= -1;

                    if (brick.isRed && !brick.wasHit) {
                        brick.wasHit = true;
                        score += 15;
                    } else {
                        brick.active = false;
                        score += 10;
                    }

                    scoreElement.textContent = score;

                    // Speed up ball slightly
                    ball.speedX *= 1.02;
                    ball.speedY *= 1.02;
                }
            }
        }
    }
}

function checkWin() {
    let allBricksInactive = true;

    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            if (bricks[r][c].active) {
                allBricksInactive = false;
                break;
            }
        }
        if (!allBricksInactive) break;
    }

    if (allBricksInactive) {
        gameWin = true;
        endGame();
    }
}

function endGame() {
    gameStarted = false;
    startButton.style.display = 'block';

    if (gameWin) {
        const endTime = (Date.now() - gameStartTime) / 1000;
        const playerName = prompt(`You won! Time: ${formatTime(endTime)}. Enter your name:`, 'Player');
        if (playerName) {
            leaderboard.addRecord(playerName, score, endTime);
        }
    }
}

function update() {
    if (gameOver || gameWin) {
        return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ball.draw();
    paddle.draw();

    for (let r = 0; r < BRICK_ROW_COUNT; r++) {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            bricks[r][c].draw();
        }
    }

    // обновить позицию шара
    if (ball.launched) {
        ball.update();
    } else {
        ball.x = paddle.x + paddle.width / 2;
    }

    if (
        ball.y + ball.radius > paddle.y &&
        ball.y - ball.radius < paddle.y + paddle.height &&
        ball.x + ball.radius > paddle.x &&
        ball.x - ball.radius < paddle.x + paddle.width
    ) {
        ball.speedY = -Math.abs(ball.speedY);

        // изменить направление мяча
        const hitPosition = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
        ball.speedX = hitPosition * 7;
    }

    collisionDetection();

    checkWin();

    // проверка на потерю жизни
    if (ball.y + ball.radius > canvas.height) {
        lives--;
        livesElement.textContent = lives;

        if (lives <= 0) {
            gameOver = true;
            endGame();
        } else {
            ball.reset();
            paddle.x = canvas.width / 2 - paddle.width / 2;
        }
    }

    // обновление спидометра
    speedElement.textContent = ball.getSpeed();

    if (gameStarted) {
        requestAnimationFrame(update);
    }
}

// таблица
leaderboard.load();