var React = require('react');
var D = React.DOM;

var md5omatic = require('md5-o-matic');

var uid = require('./uid');
var type = require('./type');
var isPrimitive = require('./is-primitive');

var Highlighter = require('./highlighter');
var highlighter = React.createFactory(Highlighter);

var PATH_PREFIX = '.root.';

var Leaf = React.createClass({
    getInitialState: function() {
        return {
            expanded: this._isInitiallyExpanded(this.props)
        };
    },
    getDefaultProps: function() {
        return {
            root: false,
            prefix: ''
        };
    },
    render: function() {
        var id = 'id_' + uid();
        var p = this.props;

        var d = {
            path: this.keypath(),
            key: p.label.toString(),
            value: p.data
        };

        var onLabelClick = this._onClick.bind(this, d);

        return D.div({ className: this.getClassName(), id: 'leaf-' + this._rootPath() },
            D.input({ className: 'json-inspector__radio', type: 'radio', name: p.id, id: id, tabIndex: -1 }),
            D.label({ className: 'json-inspector__line', htmlFor: id, onClick: onLabelClick },
                D.div({ className: 'json-inspector__flatpath' },
                    d.path),
                D.span({ className: 'json-inspector__key' },
                    parseInt(d.key, 10) + 1 || d.key, /* this.format(d.key) */
                    ':',
                    this.renderInteractiveLabel(d.key, true)),
                this.renderTitle(),
                this.renderShowOriginalButton()),
            this.renderChildren());
    },
    renderTitle: function() {
        var data = this.data();
        var t = type(data);

        var contentTypesToUnicode = {
            'text': '📄',
            'html': 'Ⓗ',
            'image': '⛵',
            'video': '🎥',
            'youtube': '𝓨',
            'vimeo': '𝓥',
            'audio': '🔊',
            'assessment': '📝'
        };

        switch (t) {
            case 'Array':
                return D.span({ className: 'json-inspector__value json-inspector__value_helper' },
                    '⋮ ' + data.length);
            case 'Object':
                return D.span({ className: 'json-inspector__value json-inspector__value_helper' },
                    ((data.content && contentTypesToUnicode[data.content.type] + '  ' + data.content.title) || 
                        data.title || 
                        Object.keys(data).length));
            default:
                return D.span({ className: 'json-inspector__value json-inspector__value_' + t.toLowerCase() },
                    this.format(String(data)),
                    this.renderInteractiveLabel(data, false));
        }
    },
    renderChildren: function() {
        var p = this.props;
        var childPrefix = this._rootPath();
        var data = this.data();

        var hiddenFields = {
            id: true,
            created_at: true,
            updated_at: true,
            chat_channel: true,
            degree_program: true,
            parent_section: true,
            url: true,
            title: true,
            assessment: true,
            duration: true,
            external_id: true,
            external_url: true,
            file_name: true,
            file_url: true,
            thumbnail_name: true,
            thumbnail_url: true,
            dok: true,
            lesson: true,
            section: true,
            course: true,
            header: true,
            position: true,
            content_body: true,
            description: true,
            caption: true,
            type: true
        };

        if (this.state.expanded && !isPrimitive(data)) {
            return Object.keys(data)
                .filter(function(key) { return !hiddenFields[key] })
                .map(function(key) {
                var value = data[key];

                return leaf({
                    data: value,
                    label: key,
                    prefix: childPrefix,
                    onClick: p.onClick,
                    id: p.id,
                    query: p.query,
                    getOriginal: this.state.original ? null : p.getOriginal,
                    key: getLeafKey(key, value),
                    isExpanded: p.isExpanded,
                    interactiveLabel: p.interactiveLabel,
                    targetNode: p.targetNode
                });
            }, this);
        }

        return null;
    },
    renderShowOriginalButton: function() {
        var p = this.props;

        if (isPrimitive(p.data) || this.state.original || !p.getOriginal || !p.query || contains(this.keypath(), p.query)) {
            return null;
        }

        return D.span({
            className: 'json-inspector__show-original',
            onClick: this._onShowOriginalClick
        });
    },
    renderInteractiveLabel: function(originalValue, isKey) {
        if (typeof this.props.interactiveLabel === 'function') {
            return this.props.interactiveLabel({
                // The distinction between `value` and `originalValue` is
                // provided to have backwards compatibility.
                value: String(originalValue),
                originalValue: originalValue,
                isKey: isKey,
                keypath: this.keypath()
            });
        }

        return null;
    },
    componentWillReceiveProps: function(p) {
        if (p.query) {
            this.setState({
                expanded: !contains(p.label, p.query)
            });
        }

        // Restore original expansion state when switching from search mode
        // to full browse mode.
        // if (this.props.query && !p.query) {
            this.setState({
                expanded: this._isInitiallyExpanded(p)
            });
        // }
    },
    _rootPath: function() {
        return this.props.prefix + '.' + this.props.label;
    },
    keypath: function() {
        return this._rootPath().substr(PATH_PREFIX.length);
    },
    data: function() {
        return this.state.original || this.props.data;
    },
    format: function(string) {
        return highlighter({
            string: string,
            highlight: this.props.query
        });
    },
    getClassName: function() {
        var cn = 'json-inspector__leaf';

        if (this.props.root) {
            cn += ' json-inspector__leaf_root';
        }

        if (this.props.targetNode === this.keypath()) {
            cn += ' json-inspector__target_node';
        }

        if (this.state.expanded) {
            cn += ' json-inspector__leaf_expanded';
        }

        if (!isPrimitive(this.props.data)) {
            cn += ' json-inspector__leaf_composite';
        }

        return cn;
    },
    toggle: function() {
        this.setState({
            expanded: !this.state.expanded
        });
    },
    _onClick: function(data, e) {
        this.props.onClick(data, this.toggle);
        e.stopPropagation();
    },
    _onShowOriginalClick: function(e) {
        this.setState({
            original: this.props.getOriginal(this.keypath())
        });

        e.stopPropagation();
    },
    _isInitiallyExpanded: function(p) {
        var keypath = this.keypath();

        if (p.root) {
            return true;
        }

        if (!p.query) {
            return p.isExpanded(keypath, p.data);
        } else {
            // When a search query is specified, first check if the keypath
            // contains the search query: if it does, then the current leaf
            // is itself a search result and there is no need to expand further.
            //
            // Having a `getOriginal` function passed signalizes that current
            // leaf only displays a subset of data, thus should be rendered
            // expanded to reveal the children that is being searched for.
            return !contains(keypath, p.query) && (typeof p.getOriginal === 'function');
        }
    }
});

// FIXME: There should be a better way to call a component factory from inside
// component definition.
var leaf = React.createFactory(Leaf);

function items(count) {
    return count + (count === 1 ? ' item' : ' items');
}

function getLeafKey(key, value) {
    if (isPrimitive(value)) {
        // TODO: Sanitize `value` better.
        var hash = md5omatic(String(value));
        return key + ':' + hash;
    } else {
        return key + '[' + type(value) + ']';
    }
}

function contains(string, substring) {
    return string.indexOf(substring) !== -1;
}

module.exports = Leaf;
