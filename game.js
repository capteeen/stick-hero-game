// Extend the base functionality of JavaScript
Array.prototype.last = function () {
    return this[this.length - 1];
};

// A sinus function that accepts degrees instead of radians
Math.sinus = function (degree) {
    return Math.sin((degree / 180) * Math.PI);
};

// Game data
let phase = "waiting"; // waiting | stretching | turning | walking | transitioning | falling
let lastTimestamp; // The timestamp of the previous requestAnimationFrame cycle

let heroX; // Changes when moving forward
let heroY; // Only changes when falling
let sceneOffset; // Moves the whole game

let platforms = [];
let sticks = [];
let trees = [];

let score = 0;
let highScore = localStorage.getItem('stickHeroHighScore') || 0;
let coins = parseInt(localStorage.getItem('coins')) || 0;
let isMuted = localStorage.getItem('stickHeroMuted') === 'true';
let currentDifficulty = 1;

// Configuration
const canvasWidth = 375;
const canvasHeight = 375;
const platformHeight = 100;
const heroDistanceFromEdge = 10; // While waiting
const paddingX = 100; // The waiting position of the hero in from the original canvas size
const perfectAreaSize = 10;

// The background moves slower than the hero
const backgroundSpeedMultiplier = 0.2;

const hill1BaseHeight = 100;
const hill1Amplitude = 10;
const hill1Stretch = 1;
const hill2BaseHeight = 70;
const hill2Amplitude = 20;
const hill2Stretch = 0.5;

const stretchingSpeed = 4; // Milliseconds it takes to draw a pixel
const turningSpeed = 4; // Milliseconds it takes to turn a degree
const walkingSpeed = 4;
const transitioningSpeed = 2;
const fallingSpeed = 2;

const heroWidth = 17;
const heroHeight = 30;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const introductionElement = document.getElementById("introduction");
const perfectElement = document.getElementById("perfect");
const restartButton = document.getElementById("restart");
const scoreElement = document.getElementById("score");

// Sound effects
const sounds = {
    stretch: new Audio('sounds/stretch.wav'),
    fall: new Audio('sounds/fall.wav'),
    perfect: new Audio('sounds/perfect.wav'),
    gameOver: new Audio('sounds/gameover.wav'),
    coin: new Audio('sounds/coin.wav')
};

// Mute/unmute functionality
const muteButton = document.createElement('button');
muteButton.id = 'mute-button';
muteButton.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
document.body.appendChild(muteButton);

muteButton.addEventListener('click', () => {
    isMuted = !isMuted;
    localStorage.setItem('stickHeroMuted', isMuted);
    muteButton.innerHTML = isMuted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
});

function playSound(soundName) {
    if (!isMuted && sounds[soundName]) {
        // Reset the audio to the beginning
        sounds[soundName].currentTime = 0;
        // Play the sound
        sounds[soundName].play().catch(error => {
            console.log("Sound playback failed:", error);
        });
    }
}

// Difficulty settings
const difficultyLevels = [
    { minScore: 0, platformGap: { min: 40, max: 200 }, platformWidth: { min: 20, max: 100 } },
    { minScore: 10, platformGap: { min: 50, max: 180 }, platformWidth: { min: 15, max: 90 } },
    { minScore: 20, platformGap: { min: 60, max: 160 }, platformWidth: { min: 15, max: 80 } },
    { minScore: 30, platformGap: { min: 70, max: 140 }, platformWidth: { min: 10, max: 70 } },
    { minScore: 50, platformGap: { min: 80, max: 120 }, platformWidth: { min: 10, max: 60 } }
];

// Get current difficulty level
function getCurrentDifficulty() {
    for (let i = difficultyLevels.length - 1; i >= 0; i--) {
        if (score >= difficultyLevels[i].minScore) {
            document.getElementById('difficulty-level').innerText = i + 1;
            return difficultyLevels[i];
        }
    }
    document.getElementById('difficulty-level').innerText = '1';
    return difficultyLevels[0];
}

// Initialize layout
resetGame();
updateHighScore();
updateCoins();

// Resets game variables and layouts but does not start the game
function resetGame() {
    phase = "waiting";
    lastTimestamp = undefined;
    sceneOffset = 0;
    score = 0;

    introductionElement.style.opacity = 1;
    perfectElement.style.opacity = 0;
    restartButton.style.display = "none";
    scoreElement.innerText = score;

    platforms = [{ x: 50, w: 50 }];
    generatePlatform();
    generatePlatform();
    generatePlatform();
    generatePlatform();

    sticks = [{ x: platforms[0].x + platforms[0].w, length: 0, rotation: 0 }];

    trees = [];
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();
    generateTree();

    heroX = platforms[0].x + platforms[0].w - heroDistanceFromEdge;
    heroY = 0;

    draw();
}

function generateTree() {
    const minimumGap = 30;
    const maximumGap = 150;

    const lastTree = trees[trees.length - 1];
    let furthestX = lastTree ? lastTree.x : 0;

    const x = furthestX + minimumGap + Math.floor(Math.random() * (maximumGap - minimumGap));
    const treeColors = ["#6D8821", "#8FAC34", "#98B333"];
    const color = treeColors[Math.floor(Math.random() * 3)];

    trees.push({ x, color });
}

function generatePlatform() {
    const difficulty = getCurrentDifficulty();
    const { min: minimumGap, max: maximumGap } = difficulty.platformGap;
    const { min: minimumWidth, max: maximumWidth } = difficulty.platformWidth;

    const lastPlatform = platforms[platforms.length - 1];
    let furthestX = lastPlatform.x + lastPlatform.w;

    const x = furthestX + minimumGap + Math.floor(Math.random() * (maximumGap - minimumGap));
    const w = minimumWidth + Math.floor(Math.random() * (maximumWidth - minimumWidth));

    const platform = {
        x,
        w,
        color: '#4CAF50',
        hasPerfectZone: Math.random() < 0.3,
        hasCoin: Math.random() < 0.4
    };

    platforms.push(platform);
}

// Initialize canvas
function setCanvasSize() {
    const aspectRatio = canvasHeight / canvasWidth;
    let newWidth, newHeight;

    if (window.innerWidth <= 768) {
        // On mobile, make canvas fill most of the screen width
        newWidth = window.innerWidth * 0.95;
        newHeight = newWidth * aspectRatio;
    } else {
        // On desktop, use original dimensions
        newWidth = canvasWidth;
        newHeight = canvasHeight;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    
    // Set actual canvas dimensions (for better pixel density)
    const scale = window.devicePixelRatio || 1;
    canvas.width = newWidth * scale;
    canvas.height = newHeight * scale;
    
    // Scale the context to match device pixel ratio
    ctx.scale(scale, scale);
    
    // Scale the drawing context to maintain game proportions
    ctx.scale(newWidth / canvasWidth, newHeight / canvasHeight);
}

// Call setCanvasSize initially and on resize
setCanvasSize();
window.addEventListener("resize", setCanvasSize);

// Mouse and touch events
function handleStart(event) {
    event.preventDefault();
    if (phase == "waiting") {
        lastTimestamp = undefined;
        introductionElement.style.opacity = 0;
        phase = "stretching";
        window.requestAnimationFrame(animate);
    }
}

function handleEnd(event) {
    event.preventDefault();
    if (phase == "stretching") {
        phase = "turning";
    }
}

// Add mouse events
canvas.addEventListener("mousedown", handleStart);
canvas.addEventListener("mouseup", handleEnd);

// Add touch events with proper handling
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault(); // Prevent default touch behavior
    handleStart(e.touches[0]);
}, { passive: false });

canvas.addEventListener("touchend", (e) => {
    e.preventDefault(); // Prevent default touch behavior
    handleEnd(e.changedTouches[0]);
}, { passive: false });

// Prevent default touch behavior on the game container
document.querySelector('.container').addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

// Update draw function to handle mobile scaling
function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Center the game view
    ctx.translate(
        -sceneOffset + paddingX,
        0
    );

    drawBackground();
    drawPlatforms();
    drawHero();
    drawSticks();

    ctx.restore();
}

function drawPlatforms() {
    platforms.forEach((platform) => {
        ctx.fillStyle = platform.color;
        ctx.fillRect(
            platform.x,
            canvasHeight - platformHeight,
            platform.w,
            platformHeight + (window.innerHeight - canvasHeight) / 2
        );

        if (sticks.last().x < platform.x) {
            ctx.fillStyle = "red";
            ctx.fillRect(
                platform.x + platform.w / 2 - perfectAreaSize / 2,
                canvasHeight - platformHeight,
                perfectAreaSize,
                perfectAreaSize
            );
        }

        // Draw perfect landing zone
        if (platform.hasPerfectZone) {
            ctx.fillStyle = '#ff4444';
            ctx.fillRect(
                platform.x + platform.w / 2 - 10,
                canvasHeight - platformHeight,
                20,
                platformHeight + (window.innerHeight - canvasHeight) / 2
            );
        }

        // Draw coin if platform has one
        if (platform.hasCoin) {
            drawCoin(platform.x + platform.w / 2, canvasHeight - platformHeight - 20);
        }
    });
}

function drawHero() {
    ctx.save();
    ctx.fillStyle = "black";
    ctx.translate(
        heroX - heroWidth / 2,
        heroY + canvasHeight - platformHeight - heroHeight / 2
    );

    drawRoundedRect(
        -heroWidth / 2,
        -heroHeight / 2,
        heroWidth,
        heroHeight - 4,
        5
    );

    const legDistance = 5;
    ctx.beginPath();
    ctx.arc(legDistance, 11.5, 3, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-legDistance, 11.5, 3, 0, Math.PI * 2, false);
    ctx.fill();

    ctx.beginPath();
    ctx.fillStyle = "white";
    ctx.arc(5, -7, 3, 0, Math.PI * 2, false);
    ctx.fill();

    ctx.fillStyle = "red";
    ctx.fillRect(-heroWidth / 2 - 1, -12, heroWidth + 2, 4.5);
    ctx.beginPath();
    ctx.moveTo(-9, -14.5);
    ctx.lineTo(-17, -18.5);
    ctx.lineTo(-14, -8.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-10, -10.5);
    ctx.lineTo(-15, -3.5);
    ctx.lineTo(-5, -7);
    ctx.fill();

    ctx.restore();
}

function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.lineTo(x, y + height - radius);
    ctx.arcTo(x, y + height, x + radius, y + height, radius);
    ctx.lineTo(x + width - radius, y + height);
    ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
    ctx.lineTo(x + width, y + radius);
    ctx.arcTo(x + width, y, x + width - radius, y, radius);
    ctx.lineTo(x + radius, y);
    ctx.arcTo(x, y, x, y + radius, radius);
    ctx.fill();
}

function drawSticks() {
    sticks.forEach((stick) => {
        ctx.save();
        ctx.translate(stick.x, canvasHeight - platformHeight);
        ctx.rotate((Math.PI / 180) * stick.rotation);
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -stick.length);
        ctx.stroke();
        ctx.restore();
    });
}

function drawBackground() {
    var gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
    gradient.addColorStop(0, "#BBD691");
    gradient.addColorStop(1, "#FEF1E1");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

    drawHill(hill1BaseHeight, hill1Amplitude, hill1Stretch, "#95C629");
    drawHill(hill2BaseHeight, hill2Amplitude, hill2Stretch, "#659F1C");

    trees.forEach((tree) => drawTree(tree.x, tree.color));
}

function drawHill(baseHeight, amplitude, stretch, color) {
    ctx.beginPath();
    ctx.moveTo(0, window.innerHeight);
    ctx.lineTo(0, getHillY(0, baseHeight, amplitude, stretch));
    for (let i = 0; i < window.innerWidth; i++) {
        ctx.lineTo(i, getHillY(i, baseHeight, amplitude, stretch));
    }
    ctx.lineTo(window.innerWidth, window.innerHeight);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawTree(x, color) {
    ctx.save();
    ctx.translate(
        (-sceneOffset * backgroundSpeedMultiplier + x) * hill1Stretch,
        getTreeY(x, hill1BaseHeight, hill1Amplitude)
    );

    const treeTrunkHeight = 5;
    const treeTrunkWidth = 2;
    const treeCrownHeight = 25;
    const treeCrownWidth = 10;

    ctx.fillStyle = "#7D833C";
    ctx.fillRect(
        -treeTrunkWidth / 2,
        -treeTrunkHeight,
        treeTrunkWidth,
        treeTrunkHeight
    );

    ctx.beginPath();
    ctx.moveTo(-treeCrownWidth / 2, -treeTrunkHeight);
    ctx.lineTo(0, -(treeTrunkHeight + treeCrownHeight));
    ctx.lineTo(treeCrownWidth / 2, -treeTrunkHeight);
    ctx.fillStyle = color;
    ctx.fill();

    ctx.restore();
}

function getHillY(windowX, baseHeight, amplitude, stretch) {
    const sineBaseY = window.innerHeight - baseHeight;
    return Math.sinus((sceneOffset * backgroundSpeedMultiplier + windowX) * stretch) * amplitude + sineBaseY;
}

function getTreeY(x, baseHeight, amplitude) {
    const sineBaseY = window.innerHeight - baseHeight;
    return Math.sinus(x) * amplitude + sineBaseY;
}

function drawCoin(x, y) {
    ctx.beginPath();
    ctx.fillStyle = '#ffd700';
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 1;
    ctx.stroke();
}

function updateCoins() {
    document.getElementById('coins').innerText = coins;
    localStorage.setItem('coins', coins);
}

function collectCoin() {
    coins++;
    updateCoins();
    document.getElementById('coins').classList.add('coin-collected');
    setTimeout(() => {
        document.getElementById('coins').classList.remove('coin-collected');
    }, 500);
    if (!isMuted) {
        playSound('coin');
    }
}

// Update high score display
function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('stickHeroHighScore', highScore);
    }
    document.getElementById('high-score').innerText = highScore;
}

// Start the game
window.requestAnimationFrame(animate);

function drawCharacter() {
    // Draw body
    ctx.fillStyle = '#333';
    ctx.fillRect(character.x, character.y, character.width, character.height);
    
    // Draw Pepe head
    const headSize = 25;
    const headX = character.x - 2;
    const headY = character.y - headSize;
    
    // Draw head base (green circle)
    ctx.beginPath();
    ctx.fillStyle = '#90EE90'; // Light green color
    ctx.arc(headX + headSize/2, headY + headSize/2, headSize/2, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw eyes
    ctx.fillStyle = '#000';
    // Left eye
    ctx.beginPath();
    ctx.arc(headX + headSize/3, headY + headSize/3, 3, 0, Math.PI * 2);
    ctx.fill();
    // Right eye
    ctx.beginPath();
    ctx.arc(headX + headSize*2/3, headY + headSize/3, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw mouth (slight curve)
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.arc(headX + headSize/2, headY + headSize*2/3, headSize/4, 0, Math.PI);
    ctx.stroke();
    
    // Draw Pepe's characteristic features
    // Eyebrows
    ctx.beginPath();
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    // Left eyebrow
    ctx.moveTo(headX + headSize/4, headY + headSize/4);
    ctx.lineTo(headX + headSize/2, headY + headSize/6);
    ctx.stroke();
    // Right eyebrow
    ctx.beginPath();
    ctx.moveTo(headX + headSize*3/4, headY + headSize/4);
    ctx.lineTo(headX + headSize/2, headY + headSize/6);
    ctx.stroke();
    
    // Draw Pepe's characteristic "fez" (hat)
    ctx.beginPath();
    ctx.fillStyle = '#FF0000'; // Red color for the fez
    ctx.arc(headX + headSize/2, headY + headSize/4, headSize/3, 0, Math.PI * 2);
    ctx.fill();
}

// The main game loop
function animate(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
        window.requestAnimationFrame(animate);
        return;
    }

    switch (phase) {
        case "waiting":
            return;
        case "stretching": {
            sticks.last().length += (timestamp - lastTimestamp) / stretchingSpeed;
            if (sticks.last().length % 10 === 0) {
                playSound('stretch');
            }
            break;
        }
        case "turning": {
            sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

            if (sticks.last().rotation > 90) {
                sticks.last().rotation = 90;

                const [nextPlatform, perfectHit] = thePlatformTheStickHits();
                if (nextPlatform) {
                    score += perfectHit ? 2 : 1;
                    scoreElement.innerText = score;
                    updateHighScore();

                    if (perfectHit) {
                        perfectElement.style.opacity = 1;
                        playSound('perfect');
                        setTimeout(() => (perfectElement.style.opacity = 0), 1000);
                    }

                    generatePlatform();
                    generateTree();
                    generateTree();
                }

                phase = "walking";
            }
            break;
        }
        case "walking": {
            heroX += (timestamp - lastTimestamp) / walkingSpeed;

            const [nextPlatform] = thePlatformTheStickHits();
            if (nextPlatform) {
                const maxHeroX = nextPlatform.x + nextPlatform.w - heroDistanceFromEdge;
                if (heroX > maxHeroX) {
                    heroX = maxHeroX;
                    phase = "transitioning";
                }
            } else {
                const maxHeroX = sticks.last().x + sticks.last().length + heroWidth;
                if (heroX > maxHeroX) {
                    heroX = maxHeroX;
                    phase = "falling";
                }
            }
            break;
        }
        case "transitioning": {
            sceneOffset += (timestamp - lastTimestamp) / transitioningSpeed;

            const [nextPlatform] = thePlatformTheStickHits();
            if (sceneOffset > nextPlatform.x + nextPlatform.w - paddingX) {
                sticks.push({
                    x: nextPlatform.x + nextPlatform.w,
                    length: 0,
                    rotation: 0
                });
                phase = "waiting";
            }
            break;
        }
        case "falling": {
            if (sticks.last().rotation < 180)
                sticks.last().rotation += (timestamp - lastTimestamp) / turningSpeed;

            heroY += (timestamp - lastTimestamp) / fallingSpeed;
            const maxHeroY = platformHeight + 100 + (window.innerHeight - canvasHeight) / 2;
            if (heroY > maxHeroY) {
                updateHighScore();
                playSound('gameOver');
                restartButton.style.display = "block";
                return;
            }
            break;
        }
    }

    draw();
    window.requestAnimationFrame(animate);
    lastTimestamp = timestamp;
}

function thePlatformTheStickHits() {
    if (sticks.last().rotation != 90)
        throw Error(`Stick is ${sticks.last().rotation}°`);
    const stickFarX = sticks.last().x + sticks.last().length;

    const platformTheStickHits = platforms.find(
        (platform) => platform.x < stickFarX && stickFarX < platform.x + platform.w
    );

    if (
        platformTheStickHits &&
        platformTheStickHits.x + platformTheStickHits.w / 2 - perfectAreaSize / 2 <
            stickFarX &&
        stickFarX <
            platformTheStickHits.x + platformTheStickHits.w / 2 + perfectAreaSize / 2
    )
        return [platformTheStickHits, true];

    return [platformTheStickHits, false];
} 