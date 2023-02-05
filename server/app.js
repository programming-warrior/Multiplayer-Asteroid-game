const express=require('express');
const app=express();
const http=require('http').createServer(app);
const FPS=100;

let ships={
    //'roomName':['player1','player2',...];
}
let clientRooms=[];

const io=require('socket.io')(http,{
    cors:{
        origin:"*",
    }
});

const Ship=()=>{
    return{
        x:100,
        y:100,
        r:20,
        velocity:1,
        angle:Math.PI/2,
        rotation:0,
        shoot:false,
        Friction:0.99,
        thrust:false,
        laser:[],
        health:5,
    }
}

const killedShip=()=>{
    return{
        x:null,
        y:null,
        r:null,
        velocity:null,
        angle:null,
        rotation:null,
        shoot:null,
        Friction:null,
        thrust:null,
        laser:[],
        health:null,
    }
}

function distanceBtw(ship,laser){
    let distance=Math.sqrt((Math.pow((ship.x-laser.x),2)+Math.pow((ship.y-laser.y),2)));
    return distance;
}

function gameLoop(ships,canvas,socket,room){
    for(let j=ships.length-1;j>=0;j--){
        let ship=ships[j];

        ship.x+=Math.cos(ship.angle)*ship.velocity;
        ship.y-=Math.sin(ship.angle)*ship.velocity;

        ship.velocity*=ship.Friction;

        ship.angle+=ship.rotation;

        if(ship.x>canvas.width ){
            ship.x=0;
        }
        else if(ship.x<0){
            ship.x=canvas.width;
        }
        else if(ship.y>canvas.height){
            ship.y=0;
        }
        else if(ship.y<0 ){
            ship.y=canvas.height;
        }
        
        for(let i=ship.laser.length-1;i>=0;i--){
            if(ship.laser[i].x>canvas.width || ship.laser[i].y>canvas.height || ship.laser[i].x<0 || ship.laser[i].y<0){
                ship.laser.splice(i,1);
            }
            else{
                ship.laser[i].x+=ship.laser[i].velocity*Math.cos(ship.laser[i].angle);
                ship.laser[i].y-=ship.laser[i].velocity*Math.sin(ship.laser[i].angle);
                
                for(let k=ships.length-1;k>=0;k--){
                    if(ships[k].health===0){
                        ships[k]=killedShip();
                        io.sockets.in(room).emit('player-lost',(k+1));
                        break;
                    }
                    if(distanceBtw(ships[k],ship.laser[i])<=ships[k].r){
                        ships[k].health -= 1;
                        ship.laser.splice(i,1);
                        break;
                    }
                }
            }
  
        }
        
    }
}

const shoot=(ship)=>{
    if(ship.shoot ){
        let laser={
            velocity:5,
        }
        laser.x=ship.x+ship.r*Math.cos(ship.angle);
        laser.y=ship.y-ship.r*Math.sin(ship.angle);  
        laser.angle=ship.angle;
        ship.laser.push(laser);
        ship.shoot=false;
    }
}

function startGameInterval(socket,ships,canvas,room){
    const interval=setInterval(()=>{
        gameLoop(ships,canvas,socket,room);
        io.to(socket.id).emit('game-interval',ships);
    },1000/FPS);
    socket.on('game-over',()=>{
        clearInterval(interval);
    })
}

function clientRoomsGenerator(length){
    const string='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#*_abcdefghijklmnopqrstuvwxyz';
    let result="";
    for(let i=0;i<length;i++){
        let randomIndex=Math.floor(Math.random()*string.length);
        result+=string[randomIndex];
    }
    return result;
}

io.on('connection',(socket)=>{
    const ship=Ship();
    socket.on('create-room',()=>{
        clientRooms.push(clientRoomsGenerator(5));
        socket.join(clientRooms[clientRooms.length-1]);
        io.to(socket.id).emit('room-code',clientRooms[clientRooms.length-1]);
        ships[clientRooms[clientRooms.length-1]]=[ship];
        socket.num=ships[clientRooms[clientRooms.length-1]].length;
        socket.room=clientRooms[clientRooms.length-1];
        console.log(clientRooms);
        // setTimeout(()=>{
        //     io.to(socket.id).emit('start-game',socket.num);
        // },4000)
        socket.on('copied',()=>{
            io.to(socket.id).emit('start-game',socket.num);
        })

    })

    socket.on('join-room',(roomName)=>{
        if(!roomName){
            return;
        }
        let matched=false;
        console.log(roomName);
        console.log(clientRooms);
        for(let i=0;i<clientRooms.length;i++){
            if(clientRooms[i]==roomName){
                matched=true;
                break;
            }
        }
        console.log(matched);
        if(!matched){
            io.to(socket.id).emit('wrong-roomname',{msg:`${roomName} is not a valid room`});
            return;
        }

        if(ships[roomName].length>=5){
            console.log('server-full');
            // socket.emit('server-full',{msg:'Opps! server is full!'});
            io.to(socket.id).emit('server-full',{msg:'Opps! server is full!'});
            return;
        }
        socket.join(roomName);
        ships[roomName].push(ship);
        socket.num=ships[roomName].length;
        socket.room=roomName;
        // socket.emit('start-game',socket.num);
        io.to(socket.id).emit('start-game',socket.num);
    })

    socket.on('canvas',(canvas,room)=>{
        socket.on('keydown',(key)=>{
            handleKeydown(key,room);
        })
        socket.on('keyup',(key)=>{
            handleKeyup(key,room);
        })
         startGameInterval(socket,ships[room],canvas,room);
    })

    socket.on('disconnected',(room)=>{
        let result=ships[room].map(ship=>{
            if(ship.health!=null){
                return true;
            }
            return false;
        })
       result =result.filter(e=>e);
       if(result.length<=1){
           let winner;
           ships[room].forEach((ship,i)=>{
                if(ship.health!=null){
                    winner=i+1;
                }
           })
           delete ships[room];
           io.sockets.in(room).emit('winner',winner);
           clientRooms.forEach((e,i)=>{
                if(room==e){
                    clientRooms.splice(i,1);
                }
            })
        }
    })

    function handleKeydown(key,room){
        if(key=='ArrowUp'){
            if(Math.floor(ships[room][socket.num-1].velocity)==0){
                ships[room][socket.num-1].velocity=FPS/10;
                ships[room][socket.num-1].thrust=true;
            }
        }
        else if(key=='ArrowLeft'){
            ships[room][socket.num-1].rotation=Math.PI/180;
        }
        else if(key=='ArrowRight'){
            ships[room][socket.num-1].rotation=-Math.PI/180;
        }
        else if(key==" "){
            ships[room][socket.num-1].shoot=true;
        }
    }

    function handleKeyup(key,room){
        if(key=='ArrowLeft' || key=='ArrowRight'){
            ships[room][socket.num-1].rotation=0;
        }
        else if(key==" "){
            shoot(ships[room][socket.num-1]);
        }
        else if(key=='ArrowUp'){
            ships[room][socket.num-1].thrust=false;
        }
    }
})


http.listen(8000);