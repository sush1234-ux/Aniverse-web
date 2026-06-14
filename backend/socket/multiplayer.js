const activePlayers = new Map(); // socket.id -> { socketId, username, userId, status, roomId }
const activeRooms = new Map();    // roomId -> roomContext

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`Multiplayer socket connected: ${socket.id}`);

    socket.on('register_player', (userData) => {
      activePlayers.set(socket.id, {
        socketId: socket.id,
        username: userData.username || 'Guest_' + socket.id.substring(0, 4),
        userId: userData.userId || 'GUEST',
        status: 'idle',
        roomId: null
      });
      broadcastLobby();
    });

    socket.on('send_challenge', (targetSocketId) => {
      const initiator = activePlayers.get(socket.id);
      const target = activePlayers.get(targetSocketId);
      if (initiator && target && target.status === 'idle') {
        io.to(targetSocketId).emit('incoming_challenge', {
          fromSocketId: socket.id,
          username: initiator.username
        });
      }
    });

    socket.on('accept_challenge', (challengerSocketId) => {
      const p1 = activePlayers.get(challengerSocketId);
      const p2 = activePlayers.get(socket.id);

      if (p1 && p2 && p1.status === 'idle' && p2.status === 'idle') {
        p1.status = 'combat';
        p2.status = 'combat';

        const roomId = `room_${challengerSocketId}_${socket.id}`;
        p1.roomId = roomId;
        p2.roomId = roomId;

        const roomContext = {
          roomId,
          p1: challengerSocketId,
          p2: socket.id,
          username1: p1.username,
          username2: p2.username,
          hp1: 100,
          hp2: 100,
          shield1: false,
          shield2: false,
          cooldown1: 0,
          cooldown2: 0,
          turn: challengerSocketId
        };

        activeRooms.set(roomId, roomContext);

        const socket1 = io.sockets.sockets.get(challengerSocketId);
        const socket2 = io.sockets.sockets.get(socket.id);
        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        io.to(roomId).emit('match_start', roomContext);
        broadcastLobby();
      }
    });

    socket.on('decline_challenge', (challengerSocketId) => {
      io.to(challengerSocketId).emit('challenge_declined', {
        username: activePlayers.get(socket.id)?.username || 'Opponent'
      });
    });

    socket.on('execute_move', ({ roomId, moveType }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;

      const isP1 = socket.id === room.p1;
      const activePlayerId = isP1 ? room.p1 : room.p2;
      const opponentId = isP1 ? room.p2 : room.p1;

      if (room.turn !== activePlayerId) return;

      let damage = 0;
      let logMsg = '';

      if (isP1 && room.cooldown1 > 0) room.cooldown1--;
      if (!isP1 && room.cooldown2 > 0) room.cooldown2--;

      if (moveType === 'basic_strike') {
        damage = 15;
        logMsg = `${isP1 ? room.username1 : room.username2} uses STRIKE! Deals damage.`;
      } else if (moveType === 'shield_defend') {
        if (isP1) room.shield1 = true;
        else room.shield2 = true;
        logMsg = `${isP1 ? room.username1 : room.username2} deploys an energy BARRIER! Next attack damage reduced by 80%.`;
      } else if (moveType === 'ultimate_burst') {
        const cooldownActive = isP1 ? room.cooldown1 > 0 : room.cooldown2 > 0;
        if (!cooldownActive) {
          damage = 35;
          if (isP1) room.cooldown1 = 2;
          else room.cooldown2 = 2;
          logMsg = `${isP1 ? room.username1 : room.username2} releases ULTIMATE FINISHER! Heavy shockwaves delivered.`;
        } else {
          damage = 0;
          logMsg = `${isP1 ? room.username1 : room.username2} tried to cast Ultimate, but it is recharging!`;
        }
      }

      if (damage > 0) {
        const opponentShielded = isP1 ? room.shield2 : room.shield1;
        if (opponentShielded) {
          damage = Math.round(damage * 0.2);
          logMsg += ` Barrier absorbed most of the blast! Only ${damage} damage taken.`;
          if (isP1) room.shield2 = false;
          else room.shield1 = false;
        }

        if (isP1) {
          room.hp2 = Math.max(0, room.hp2 - damage);
        } else {
          room.hp1 = Math.max(0, room.hp1 - damage);
        }
      }

      room.turn = opponentId;

      let winner = null;
      if (room.hp1 <= 0) {
        winner = room.p2;
        logMsg += ` Match over! ${room.username2} wins!`;
      } else if (room.hp2 <= 0) {
        winner = room.p1;
        logMsg += ` Match over! ${room.username1} wins!`;
      }

      const updatedPayload = {
        ...room,
        lastMoveLog: logMsg,
        winner
      };

      io.to(roomId).emit('game_state_update', updatedPayload);

      if (winner) {
        const p1 = activePlayers.get(room.p1);
        const p2 = activePlayers.get(room.p2);
        if (p1) { p1.status = 'idle'; p1.roomId = null; }
        if (p2) { p2.status = 'idle'; p2.roomId = null; }
        activeRooms.delete(roomId);
        broadcastLobby();
      }
    });

    socket.on('disconnect', () => {
      const player = activePlayers.get(socket.id);
      if (player) {
        if (player.status === 'combat' && player.roomId) {
          const room = activeRooms.get(player.roomId);
          if (room) {
            const opponentId = socket.id === room.p1 ? room.p2 : room.p1;
            const oppPlayer = activePlayers.get(opponentId);
            if (oppPlayer) {
              oppPlayer.status = 'idle';
              oppPlayer.roomId = null;
            }
            io.to(room.roomId).emit('opponent_disconnected', {
              message: 'Your opponent disconnected from the match stage.'
            });
            activeRooms.delete(player.roomId);
          }
        }
        activePlayers.delete(socket.id);
        broadcastLobby();
      }
      console.log(`Multiplayer socket disconnected: ${socket.id}`);
    });

    function broadcastLobby() {
      const idleList = Array.from(activePlayers.values()).filter(p => p.status === 'idle');
      io.emit('lobby_update', idleList);
    }
  });
};
