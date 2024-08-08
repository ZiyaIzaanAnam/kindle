class Game {
    constructor(pieces) {
        this.pieces = pieces;
        this.turn = 'white';
        this.clickedPiece = null;
        this._events = {
            pieceMove: [],
            kill: [],
            check: [],
            promotion: [],
            checkMate: [],
            turnChange: []
        };
    }

    clearEvents() {
        this._events = {};
    }

    on(eventName, callback) {
        if (this._events[eventName] && typeof callback === 'function') {
            this._events[eventName].push(callback);
        }
    }

    changeTurn() {
        this.turn = this.turn === 'white' ? 'black' : 'white';
        this.triggerEvent('turnChange', this.turn);
    }

    getPiecesByColor(color) {
        return this.pieces.filter(obj => obj.color === color);
    }

    getPlayerPositions(color) {
        const pieces = this.getPiecesByColor(color);
        return pieces.map(a => parseInt(a.position));
    }

    filterPositions(positions) {
        return positions.filter(pos => {
            const secondDigit = pos.toString().charAt(1);
            return pos > 10 && pos < 89 && secondDigit < 9 && secondDigit > 0;
        });
    }

    unblockedPositions(piece, allowedPositions, checking = true) {
        const unblockedPositions = [];

        if (piece.color === 'white') {
            var myBlockedPositions = this.getPlayerPositions('white');
            var otherBlockedPositions = this.getPlayerPositions('black');
        } else {
            var myBlockedPositions = this.getPlayerPositions('black');
            var otherBlockedPositions = this.getPlayerPositions('white');
        }

        if (piece.hasRank('pawn')) {
            for (const move of allowedPositions[0]) { //attacking moves
                if (checking && this.myKingChecked(move)) continue;
                if (otherBlockedPositions.indexOf(move) !== -1) unblockedPositions.push(move);
            }
            const blockedPositions = [...myBlockedPositions, ...otherBlockedPositions];
            for (const move of allowedPositions[1]) { //moving moves
                if (blockedPositions.indexOf(move) !== -1) {
                    break;
                } else if (checking && this.myKingChecked(move, false)) continue;
                unblockedPositions.push(move);
            }
        } else {
            allowedPositions.forEach((allowedPositionsGroup, index) => {
                for (const move of allowedPositionsGroup) {
                    if (myBlockedPositions.indexOf(move) !== -1) {
                        break;
                    } else if (checking && this.myKingChecked(move)) {
                        if (otherBlockedPositions.indexOf(move) !== -1) {
                            break;
                        }
                        continue;
                    }
                    unblockedPositions.push(move);

                    if (otherBlockedPositions.indexOf(move) !== -1) {
                        break;
                    }
                }
            });
        }

        return this.filterPositions(unblockedPositions);
    }

    getPieceAllowedMoves(pieceName) {
        const piece = this.getPieceByName(pieceName);
        if (this.turn === piece.color) {
            this.setClickedPiece(piece);

            let pieceAllowedMoves = piece.getAllowedMoves();
            if (piece.rank === 'king') {
                pieceAllowedMoves = this.getCastlingSquares(piece, pieceAllowedMoves);
            }

            return this.unblockedPositions(piece, pieceAllowedMoves, true);
        } else {
            return null;
        }
    }

    getPieceByName(name) {
        return this.pieces.find(piece => piece.name === name);
    }

    getPieceByPos(position) {
        return this.pieces.find(piece => piece.position === position);
    }

    getCastlingSquares(piece, allowedSquares) {
        const castlingSquares = piece.getCastlingMoves();
        if (piece.color === 'white') {
            var blockedPositions = this.getPlayerPositions('white');
            var opponentPositions = this.getPlayerPositions('black');
        } else {
            var blockedPositions = this.getPlayerPositions('black');
            var opponentPositions = this.getPlayerPositions('white');
        }

        for (const move of castlingSquares) {
            if (blockedPositions.includes(move) || opponentPositions.includes(move)) continue;
            allowedSquares.push(move);
        }

        return allowedSquares;
    }

    myKingChecked(squarePos, kingsCheck = true) {
        const myKing = this.getPieceByName(this.turn + 'King');
        const enemyMoves = this.unblockedPositions(
            this.getPieceByColor(this.turn === 'white' ? 'black' : 'white'),
            this.getPieceByColor(this.turn === 'white' ? 'black' : 'white').map(enemyPiece => enemyPiece.getAllowedMoves())
        );

        if (kingsCheck && enemyMoves.includes(myKing.position)) return true;
        return false;
    }

    movePiece(pieceName, position) {
        const piece = this.getPieceByName(pieceName);
        const piecePosition = piece.position;
        const destinationPiece = this.getPieceByPos(position);
        if (destinationPiece) {
            if (destinationPiece.color === piece.color) {
                return;
            }
            this.triggerEvent('kill', destinationPiece);
        }

        piece.position = position;
        this.triggerEvent('pieceMove', piece);

        if (piece.hasRank('pawn') && piece.position.toString().charAt(1) === '8' || piece.position.toString().charAt(1) === '1') {
            this.triggerEvent('promotion', piece.promote());
        }

        if (this.myKingChecked(piece.position)) {
            this.triggerEvent('checkMate', this.turn);
            return;
        }

        this.changeTurn();
    }

    triggerEvent(eventName, ...args) {
        if (this._events[eventName]) {
            this._events[eventName].forEach(callback => callback(...args));
        }
    }
}

class Piece {
    constructor(position, name, color) {
        this.position = position;
        this.name = name;
        this.color = color;
    }

    hasRank(rank) {
        return this.name.includes(rank);
    }
}

class King extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [
            currentPos + 1, // right
            currentPos - 1, // left
            currentPos - 10, // down
            currentPos + 10, // up
            currentPos - 9, // bottom-right diagonal
            currentPos - 11, // bottom-left diagonal
            currentPos + 9, // top-right diagonal
            currentPos + 11, // top-left diagonal
        ];
        return this.filterMoves(allowedMoves);
    }

    getCastlingMoves() {
        if (this.color === 'white') {
            return [31, 32];
        } else {
            return [81, 82];
        }
    }
}

class Queen extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [];
        // Horizontal and Vertical Moves
        for (let i = 1; i < 8; i++) {
            allowedMoves.push(currentPos + i);
            allowedMoves.push(currentPos - i);
            allowedMoves.push(currentPos + i * 10);
            allowedMoves.push(currentPos - i * 10);
        }
        // Diagonal Moves
        for (let i = 1; i < 8; i++) {
            allowedMoves.push(currentPos + i * 11);
            allowedMoves.push(currentPos - i * 11);
            allowedMoves.push(currentPos + i * 9);
            allowedMoves.push(currentPos - i * 9);
        }
        return this.filterMoves(allowedMoves);
    }
}

class Rook extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [];
        // Horizontal and Vertical Moves
        for (let i = 1; i < 8; i++) {
            allowedMoves.push(currentPos + i);
            allowedMoves.push(currentPos - i);
            allowedMoves.push(currentPos + i * 10);
            allowedMoves.push(currentPos - i * 10);
        }
        return this.filterMoves(allowedMoves);
    }
}

class Bishop extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [];
        // Diagonal Moves
        for (let i = 1; i < 8; i++) {
            allowedMoves.push(currentPos + i * 11);
            allowedMoves.push(currentPos - i * 11);
            allowedMoves.push(currentPos + i * 9);
            allowedMoves.push(currentPos - i * 9);
        }
        return this.filterMoves(allowedMoves);
    }
}

class Knight extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [
            currentPos + 21, currentPos - 21,
            currentPos + 19, currentPos - 19,
            currentPos + 12, currentPos - 12,
            currentPos + 8, currentPos - 8
        ];
        return this.filterMoves(allowedMoves);
    }
}

class Pawn extends Piece {
    getAllowedMoves() {
        const currentPos = parseInt(this.position);
        const allowedMoves = [];
        if (this.color === 'white') {
            allowedMoves.push(currentPos + 10); // Move forward
            if (currentPos < 30) {
                allowedMoves.push(currentPos + 20); // Double move
            }
        } else {
            allowedMoves.push(currentPos - 10); // Move forward
            if (currentPos > 60) {
                allowedMoves.push(currentPos - 20); // Double move
            }
        }
        return this.filterMoves(allowedMoves);
    }

    promote() {
        return new Queen(this.position, this.name, this.color);
    }
}
