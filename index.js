// server web page
const http = require('http')
const app = require('express')()
const dotenv = require('dotenv')

dotenv.config()

// PORTS 
const PORT = process.env.PORT || 8000
const HTML_PORT = process.env.HTML_PORT || 8081

// serving html page
app.get('/',(req,res) => {
    res.sendFile(__dirname + '/index.html')
})
app.listen(HTML_PORT,() => console.log("Listening on http port 8081"))

// web socket
const WebSocketServer = require('websocket').server;

const httpServer = http.createServer((req,res) => {
    console.log((new Date()) + 'Received request for ' + req.url)
    res.writeHead(404);
    res.end()
})

httpServer.listen(PORT,() => console.log("WEB SOCKET SERVER listening on PORT 8080"))

wsServer = new WebSocketServer({
    httpServer: httpServer
    // httpServer is now web socket server
})

//hashmap
let clients = {}
let games = {}

wsServer.on('request',request => {
    // connect
    const connection = request.accept(null,request.origin)
    console.log('Connection Accepted : ',connection)

    connection.on('open',() => console.log("opened!!!"))
    connection.on('close',() => console.log("closed!!!"))
    connection.on('message',(message) => {
        // I got message from client
        const result = JSON.parse(message.utf8Data)

        // Create Game
        if(result.method === 'create'){
            const clientId = result.clientId
            const gameId = guid()
            games[gameId] = {
                "id": gameId,
                "cells": result.cells,
                "admin": result.admin,
                "clients": []
            }

            const payload = {
                "method": "create",
                "game": games[gameId]
            }

            const con = clients[clientId].connection
            con.send(JSON.stringify(payload))

        }
        
        // client want to join game
        if(result.method === 'join'){

            const clientId = result.clientId;
            const gameId = result.gameId
            console.log('gameId: '+gameId+" clientId: "+clientId)
            const game = games[gameId]

            if(game.clients.length >= 5){
                // sorry max players reach
                return;
            }

            const color = {"0": "Red", "1": "Green", "2": "Blue","3": "Yellow","4": "Skyblue"}[game.clients.length]
            
            game.clients.push({
                "clientId": clientId,
                "color": color
            })

            //if(game.clients.length === 3) updateGameState();

            const payload = {
                "method": "join",
                "game": game
            }

            // loop through all clients and tell them that people has joined
            game.clients.forEach(c => {
                //console.log('me joined:- ',clientId)
                clients[c.clientId].connection.send(JSON.stringify(payload))
            })
        }

        // game start
        if(result.method === 'start'){
            const game = games[result.gameId]
            let time = new Date();
            let mins 
            if(game.clients.length >= 2){
                const payload = {
                    "method": "start",
                    "game": game
                }
                game.clients.forEach(c => {
                    //console.log('game started - ',game.id)
                    clients[c.clientId].connection.send(JSON.stringify(payload))
                })
                let startTime = setInterval(updateGameState,200)

                setTimeout(stop_interval,10000)

                function stop_interval(){
                    clearInterval(startTime)

                    // Dynamic
                    let state = game.state
                    
                    let colors = Object.values(state)

                    
                    let numColors = {}

                    colors.forEach(color => {
                        if(numColors[color]){
                            numColors[color] += 1
                        }else{
                            numColors[color] = 1
                        }
                        
                    })

                    let entries = Object.entries(numColors)
                    let max = [entries[0]];

                    for(i = 0 ;i < (entries.length - 1);i++){

                        if(entries[i+1][1] > max[0][1]){
                        max = [entries[i+1]]
                        }else if(entries[i+1][1] === max[0][1]){
                        max.push(entries[i+1])
                        }else{
                        
                        }
                    
                    }
                    let winner;
                    if(max.length === 1){
                        winner = max[0][0]
                    }else{
                        winner = 'Draw'
                    }
                        

                    

                    // static

                    // let red = 0;
                    // let green = 0;
                    
                    
                    // for(let g of Object.keys(state)){

                    //     if(state[g] === 'Red'){
                    //         red++;
                    //     }else{
                    //         green++;
                    //     }
                    // }
                    // let playerCell = {
                    //     "Red": red,
                    //     "Green": green
                    // }
                    // let winner;
                    // if(red > green){
                    //     winner = 'Red'
                    // }else if(green > red){
                    //     winner = 'Green'
                    // }else{
                    //     winner = 'Draw'
                    // }

                    const payload = {
                        "method": "result",
                        "playerCell": numColors,
                        "winner": winner
                    }
                   
                    game.clients.forEach(c => {
                        //console.log('game started - ',game.id)
                        clients[c.clientId].connection.send(JSON.stringify(payload))
                    })
                }
            }
                   
        }

        // user plays
        if(result.method === 'play'){
            const clientId = result.clientId;
            const gameId = result.gameId;
            const cellId = result.cellId;
            const color = result.color

            let state = games[gameId].state;

            if(!state)
                state = {}

            state[cellId] = color;
            games[gameId].state = state;
        }

    }) // onmessage

   

    // generate a new clientId
    const clientId = guid2()
    clients[clientId] = {
        "connection": connection
    }

    const payload = {
        "method": "connect",
        "clientId": clientId
    }
    // send back to the client
    //console.log(JSON.stringify(payload))
    connection.send(JSON.stringify(payload))
    
})

 // update game state
 function updateGameState() {
    
    for (const g of Object.keys(games)){
        const game = games[g]
        const payload = {
            "method": "update",
            "game": game
        }
        game.clients.forEach(c => {
            clients[c.clientId].connection.send(JSON.stringify(payload))
        })
    }
}

// random id generator
function S4() {
    return ( ((1+Math.random())*0x111111 |0).toString(16) )
}
const guid = () => (S4())
const guid2 = () => (S4() + "-" + S4())