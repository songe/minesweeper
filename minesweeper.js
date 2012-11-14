$(function(){

var Tile = Backbone.Model.extend({
    defaults: {
        // x, y, neighbors[] initialized by Grid
        mined: false,
        flagged: false,
        revealed: false,
        value: 0,
        cheat: false,
    },
    
    inc: function() {
        this.set({value: this.get('value') + 1});
    },

    toggle: function() {
        if (!this.get('revealed')) { this.set({flagged: !this.get('flagged')}); }
    },

    reveal: function() {
        if (this.get('revealed') || this.get('flagged')) {
            return;
        }
        
        this.set({revealed: true});
        
        if (this.get('mined')) {
            return Tiles.validate();
        }
    
        if (!this.get('value')) { // if this.value == 0
            // reveal all the tiles around it as well
            _.each(this.get('neighbors'), function(tile) {
                if (!tile.get('revealed') && !tile.get('mined')) {
                    tile.reveal();
                }
            });
        }
        
        if (Tiles.remaining().length == Tiles.mined().length) { Tiles.validate(); }
    },
});

var Grid = Backbone.Collection.extend({
    model: Tile,

    defaults: function() {
        this.x = 8;
        this.y = 8;
        this.mines = 10;
        this.cheated = false;
        this.gameover = false;
        
        // initialize the tiles
        var tiles = [];
        for (var y = 0; y < this.y; y++) {
            var tileRow = [];
            for (var x = 0; x < this.x; x++) {
                tileRow.push(new Tile({x: x, y: y}));
            }
            tiles.push(tileRow);
        }
        
        // set tiles.neighbors
        for (var y = 0; y < this.y; y++) {
            for (var x = 0; x < this.x; x++) {
                var neighbors = [];
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        if (tiles[x+dx] && tiles[x+dx][y+dy]) {
                            neighbors.push(tiles[x+dx][y+dy]);
                        }
                    }
                }
                tiles[x][y].set({neighbors: neighbors});
            }
        }
        
        // plant mines
        var mines = this.mines;
        while (mines) {
            var x = Math.floor(this.x * Math.random());
            var y = Math.floor(this.y * Math.random());
            
            if (!tiles[x][y].get('mined')) {
                tiles[x][y].set({mined: true});
                _.each(tiles[x][y].get('neighbors'), function(tile) { tile.inc() });
                mines--;
            }
        }
        
        // flatten the 2D array
        for (var length = tiles.length; 0 < length; length--) {
            var row = tiles.shift();
            _.each(row, function(tile) { tiles.push(tile); });
        }
        
        return tiles;
    },

    initialize: function() {
        this.add(this.defaults());
    },

    revealed: function() {
        return this.filter(function(tile) {return tile.get('revealed');});
    },

    remaining: function() {
        return this.without.apply(this, this.revealed());
    },

    flagged: function() {
        return this.filter(function(tile) { return tile.get('flagged') });
    },
    
    mined: function() {
        return this.filter(function(tile) { return tile.get('mined') });
    },

    comparator: function(todo) {
        return todo.get('x') + (this.x * todo.get('y'));
    },
    
    row: function(row) {
        return this.filter(function(tile) { return tile.get('y') == row; });
    },
    
    validate: function(clicked) {
        if (this.gameover) { return; }
        
        var flagged = this.flagged();
        var remaining = this.remaining();
        var mined = this.mined();
        
        if (
            (flagged.length == mined.length) && 
            (flagged.every(function(f,i){return f == mined[i]})) ||
            (remaining.length == mined.length) &&
            (remaining.every(function(f,i){return f == mined[i]}))
        ) {
            !this.cheated ? 
                notify('You win!') : 
                notify('You win! ...but you cheated. \u0CA0_\u0CA0');
        } else if(!clicked && this.revealed().length == 1) { // unlucky first step
            alert('Tough luck!');
            return Game.new_game();
        } else {
            notify('You lose!');
        }
        
        this.revealMines();
        this.gameover = true;
    },
    
    revealMines: function() {
        $.each(this.mined(), function(){this.set({revealed: true})});
    },
    
    cheat: function() {
        this.each(function(tile){tile.set({cheat: true})});
        this.cheated = true;
    },
});

function notify(message) {
    /* "forks thread" to "support concurrency" so the next execution 
    doesn't have to wait on the user clearing the alert message */
    setTimeout(function(){ alert(message) }, 0);
}

var Tiles = new Grid;

var TileView = Backbone.View.extend({
    tagName: 'td',
    
    className: 'tile',
    
    template: _.template($('#tile-template').html()),
    
    events: {
        'click': 'reveal',
        'contextmenu': 'toggle',
        'taphold': 'toggle' // for mobile devices
    },

    initialize: function() {
        this.model.bind('change', this.render, this);
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.toggleClass('flagged', this.model.get('flagged'));
        this.$el.toggleClass('revealed', this.model.get('revealed'));
        this.$el.toggleClass('mined', 
            (this.model.get('cheat') || this.model.get('revealed')) &&
            this.model.get('mined'));
        return this;
    },

    reveal: function() {
        this.model.reveal();
    },
    
    toggle: function() {
        this.model.toggle();
        return false; // prevents contextmenu
    },

    clear: function() {
        this.model.clear();
    },
});

var GameView = Backbone.View.extend({
    el: $('#game'),

    statusTemplate: _.template($('#status-template').html()),

    events: {
        'click #validate': 'validate',
        'click #new': 'new_game',
        'click #cheat': 'cheat'
    },

    initialize: function() {
        Tiles.bind('all', this.render, this);
        Tiles.bind('reset', this.reset, this);
        
        this.grid = $('#grid');
        this.status = $('#status');
        
        this.addAll();
        this.render();
    },
    
    reset: function() {
        this.removeAll();
        this.addAll();
        this.render();
    },

    render: function() {
        var revealed = Tiles.revealed().length;
        var remaining = Tiles.remaining().length;
        var flagged = Tiles.flagged().length;
        var mined = Tiles.mines;

        this.status.html(this.statusTemplate({
            revealed: revealed, 
            remaining: remaining,
            flagged: flagged,
            mined: mined,
        }));
    },
    
    new_game: function() {
        Tiles.reset( Tiles.defaults() );
    },

    addTile: function(tile) {
        var view = new TileView({model: tile});
        this.$('#grid tr:last').append(view.render().el);
    },

    addRow: function(row) {
        _.each(Tiles.row(row), this.addTile);
    },

    addAll: function() {
        for (var row = 0; row < Tiles.y; row++) {
            this.$('#grid').append("<tr></tr>");
            this.addRow(row);
        }
    },
    
    removeAll: function() {
        this.$('#grid tr').remove();
    },
    
    validate: function() {
        Tiles.validate(true);
    },
    
    cheat: function() {
        Tiles.cheat();
    },
});

var Game = new GameView;

});
