$(function(){

var Tile = Backbone.Model.extend({
    defaults: {
        x: null,
        y: null,
        mined: false,
        flagged: false,
        revealed: false,
        value: 0,
    },
    
    inc: function() {
        this.set({value: this.get('value') + 1});
    },

    toggle: function() {
        if (!this.get('revealed')) { this.set({flagged: !this.get('flagged')}) };
    },

    reveal: function() {
        if (this.get('revealed') || this.get('flagged')) {
            return;
        } else if (this.get('mined')) {
            return Tiles.validate();
        }
        
        this.set({revealed: true});
    
        if (!this.get('value')) { // if this.value == 0
            // reveal all the tiles around it as well
            _.each(this.get('neighbors'), function(tile) {
                if (!tile.get('revealed') && !tile.get('mined')) {
                    tile.reveal();
                }
            });
        }
    },
});

var Grid = Backbone.Collection.extend({
    model: Tile,

    defaults: function() {
        this.x = 8;
        this.y = 8;
        this.mines = 10;
        
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
    
    validate: function() {
        var flagged = this.flagged();
        var mined = this.mined();
        (flagged.length == mined.length) && 
            (flagged.every(function(f,i){return f == mined[i]})) ?
            alert ('You win!') : alert('You lose!');
        this.reset( this.defaults() );
    },
});

var Tiles = new Grid;

var TileView = Backbone.View.extend({
    tagName: 'td',
    
    className: 'tile',
    
    template: _.template($('#tile-template').html()),
    
    events: {
        'click': 'toggle',
        'dblclick': 'reveal',
    },

    initialize: function() {
        this.model.bind('change', this.render, this);
    },

    render: function() {
        this.$el.html(this.template(this.model.toJSON()));
        this.$el.toggleClass('flagged', this.model.get('flagged'));
        this.$el.toggleClass('revealed', this.model.get('revealed'));
        return this;
    },

    reveal: function() {
        this.model.reveal();
    },
    
    toggle: function() {
        this.model.toggle();
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

        this.status.html(this.statusTemplate({
            revealed: revealed, 
            remaining: remaining,
            flagged: flagged,
        }));
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
        Tiles.validate();
        this.reset();
    },
});

var Game = new GameView;

});
