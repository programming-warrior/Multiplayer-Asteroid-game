const DisplayScreen=document.querySelector('#display-screen');
const joinBtn=document.querySelector('#join-btn');
const createBtn=document.querySelector('#create-btn');
const input=document.querySelector('#code-input');
const roomCodeInfo=document.querySelector('#room-code-info');

let copyBtn;

const canvas=document.getElementById('canvas');
const context=canvas.getContext('2d');


let playerNum; 
let room;

// console.log('hello');

//establishing connection with the backend
const socket=io('https://multiplayer-asteroid-game-programming.onrender.com/');

socket.on('connect',()=>{
    console.log('connected');
    createBtn.addEventListener('click',()=>{
        socket.emit('create-room');
    })
    
    joinBtn.addEventListener('click',()=>{
        room=input.value;
        socket.emit('join-room',room);
    })

    socket.on('room-code',(roomCode)=>{
        room=roomCode;
        console.log(room);
        roomCodeInfo.value=roomCode;
        copyBtn=document.createElement('button');
        copyBtn.classList.add("button-52");
        copyBtn.innerHTML='start the game';
        DisplayScreen.append(copyBtn);
        copyBtn.addEventListener('click',()=>{
            roomCodeInfo.select();
            document.execCommand('copy');
            socket.emit('copied');
        })
    })


    socket.on('start-game',(num)=>{
        playerNum=num;
        startGame();
    })

    socket.on('game-interval',(ships)=>{
        handleGameInterval(ships);
    });


    socket.on('server-full',({msg})=>{
        reset(msg);
    })


    socket.on('player-lost',(player)=>{
        if(playerNum==player){
            console.log(player);
            socket.emit('disconnected',room);
            reset("You lost!");
        }
        else{
            console.log(`${player} has been killed`);
        }
    })

    socket.on('winner',(player)=>{
        console.log('winner event is emitted');
        if(playerNum==player){
            console.log('You won!');
            socket.emit('game-over');
            reset('You won!');
        }
    })

    socket.on('wrong-roomname',({msg})=>{
        reset(msg);
    })


    document.addEventListener('keydown',(e)=>{
        socket.emit('keydown',e.key);
    })
    document.addEventListener('keyup',(e)=>{
        socket.emit('keyup',e.key);
    })
})

function startGame(){
    DisplayScreen.style.display="none";
    canvas.style.display="block";
    canvas.width=window.innerWidth;
    canvas.height=window.innerHeight;

    socket.emit('canvas',{width:canvas.width,height:canvas.height},room);
}

function reset(msg){
    DisplayScreen.style.display="flex";
    canvas.style.display="none";
    roomCodeInfo.value=msg;
    input.value="";
    socket.disconnect();
    document.removeEventListener('keydown',(e)=>{
        socket.emit('keydown',e.key);
    })
    document.removeEventListener('keyup',(e)=>{
        socket.emit('keyup',e.key);
    })
}

function handleGameInterval(ships){
    paintCanvas();
    paintShip(ships);
}

function paintCanvas(){
    context.fillStyle="black";
    context.fillRect(0,0,canvas.width,canvas.height);
}

function paintShip(ships){
    for(let j=0;j<ships.length;j++){
        let ship=ships[j];
        
        if(ship.thrust===true){
            context.fillStyle="yellow";
            context.strokeStyle="orange";
            context.lineWidth=5;
            context.beginPath();
            context.moveTo(ship.x+2*ship.r*Math.cos(Math.PI-ship.angle),ship.y+2*ship.r*Math.sin(Math.PI-ship.angle));
            context.lineTo(ship.x+0.5*ship.r*Math.cos(43*Math.PI/60-ship.angle),ship.y+0.5*ship.r*Math.sin(43*Math.PI/60-ship.angle));
            context.lineTo(ship.x-0.5*ship.r*Math.cos(-17*Math.PI/60+ship.angle),ship.y+0.5*ship.r*Math.sin(-17*Math.PI/60+ship.angle));
            context.closePath();
            context.stroke();
            context.fill();
        }

        context.beginPath();
        context.strokeStyle="white";
        context.fillStyle="black";
        context.lineWidth=1;
        context.moveTo(ship.x+ship.r*Math.cos(ship.angle),ship.y-ship.r*Math.sin(ship.angle));
        context.lineTo(ship.x+ship.r*Math.cos(43*Math.PI/60-ship.angle),ship.y+ship.r*Math.sin(43*Math.PI/60-ship.angle));
        context.lineTo(ship.x-ship.r*Math.cos(-17*Math.PI/60+ship.angle),ship.y+ship.r*Math.sin(-17*Math.PI/60+ship.angle));
        context.closePath();
        context.stroke();
        context.fill();


        const color=['#4EC565','#5EA7F2 ','#F24B31 ','#F3F33C ','#D0D3D4'];
        context.fillStyle=color[j];
        context.fillRect(ship.x+ship.r*Math.cos(ship.angle)+20,ship.y-ship.r*Math.sin(ship.angle)-20,10*ship.health,10);

        for(let i=ship.laser.length-1;i>=0;i--){
            context.fillStyle="white";
            context.beginPath();
            context.arc(ship.laser[i].x,ship.laser[i].y,ship.r/10,0,Math.PI*2,false);
            context.fill();
        }
    }
}


