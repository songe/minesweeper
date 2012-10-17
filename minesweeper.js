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
        this.set({revealed: true, flagged: false});
        return this.get('mined');
    },
});

var Grid = Backbone.Collection.extend({
    model: Tile,

    defaults: function() {
        this.x = 8;
        this.y = 8;
        this.mines = 10;
        
        var tiles = [];
        for (var row = 0; row < this.y; row++) {
            var tileRow = [];
            for (var col = 0; col < this.x; col++) {
                tileRow.push(new Tile({x: col, y: row}));
            }
            tiles.push(tileRow);
        }
        
        var mines = this.mines;
        while (mines) {
            var x = Math.floor(this.x * Math.random());
            var y = Math.floor(this.y * Math.random());
            
            if (!tiles[x][y].get('mined')) {
                tiles[x][y].set({mined: true});
                for (var dy = -1; dy <= 1; dy++) {
                    for (var dx = -1; dx <= 1; dx++) {
                        if (tiles[x+dx] && tiles[x+dx][y+dy]) {
                            tiles[x+dx][y+dy].inc();
                        }
                    }
                }
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
        
        this.grid = $('#grid');
        this.status = $('#status');
        
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
    
    validate: function() {
        Tiles.validate();
    },
});

var Game = new GameView;

});
