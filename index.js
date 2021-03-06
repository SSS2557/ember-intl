/* jshint node: true */

/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

'use strict';


var serialize          = require('serialize-javascript');
var mergeTrees         = require('broccoli-merge-trees');
var Funnel             = require('broccoli-funnel');
var stew               = require('broccoli-stew');
var walkSync           = require('walk-sync');
var chalk              = require('chalk');
var path               = require('path');
var fs                 = require('fs');

var utils              = require('./lib/utils');
var LocaleWriter       = require('./lib/locale-writer');
var TranslationBlender = require('./lib/translation-blender');

var intlPath           = path.dirname(require.resolve('intl'));
var name               = 'ember-intl';

module.exports = {
    name: name,

    included: function() {
        this._super.included.apply(this, arguments);
        this.intlOptions = this.intlOptions();
    },

    intlOptions: function () {
        var projectConfig = this.project.config(process.env.EMBER_ENV);

        var options = utils.assign({
            locales        : undefined,
            disablePolyfill: false,
            defaultLocale  : 'en-us',
            inputPath      : 'translations',
            outputPath     : path.join(projectConfig.modulePrefix, 'translations')
        }, projectConfig.intl);

        if (options.locales) {
            options.locales = utils.makeArray(options.locales).filter(function(locale) {
                return typeof locale === 'string';
            }).map(function(locale) {
                return locale.toLowerCase();
            });
        }

        return options;
    },

    setupPreprocessorRegistry: function (type, registry) {
        var intlOptions = this.intlOptions();

        registry.add('js', {
            name: 'translations',
            ext:  'js',
            toTree: function (tree) {
                var translations = new Funnel(intlOptions.inputPath, {
                    allowEmpty: true
                });

                return mergeTrees([
                    tree,
                    TranslationBlender(translations, intlOptions)
                ]);
            }
        });
    },

    treeForAddon: function() {
        var tree = this._super.treeForAddon.apply(this, arguments);
        var root = path.join('modules', name);

        if (utils.isModern(this)) {
            tree = stew.rm(tree, path.join(root, 'helpers', 'intl-get-legacy.js'));
            tree = stew.rm(tree, path.join(root, 'helpers', '-base-legacy.js'));
        } else {
            tree = stew.rm(tree, path.join(root, 'initializers', 'ember-intl.js'));
            tree = stew.mv(tree, path.join(root, 'initializers', 'ember-intl-legacy.js'), path.join(root, 'initializers', 'ember-intl.js'));
            tree = stew.rm(tree, path.join(root, 'helpers', 'intl-get.js'));
            tree = stew.mv(tree, path.join(root, 'helpers', 'intl-get-legacy.js'), path.join(root, 'helpers', 'intl-get.js'));
            tree = stew.rm(tree, path.join(root, 'helpers', '-base.js'));
            tree = stew.mv(tree, path.join(root, 'helpers', '-base-legacy.js'), path.join(root, 'helpers', '-base.js'));
        }

        return tree;
    },

    treeForApp: function (inputTree) {
        if (utils.isModern(this)) {
            inputTree = stew.rm(inputTree, path.join('initializers', 'ember-intl-legacy.js'));
        } else {
            inputTree = stew.rm(inputTree, path.join('initializers', 'ember-intl.js'));
            inputTree = stew.mv(inputTree, path.join('initializers', 'ember-intl-legacy.js'), path.join('initializers', 'ember-intl.js'));
        }

        var trees        = [inputTree];
        var intlOptions  = this.intlOptions;
        var translations = path.join(this.project.root, intlOptions.inputPath);
        var locales      = [];

        if (fs.existsSync(translations)) {
            locales = walkSync(translations).map(function (filename) {
                return path.basename(filename, path.extname(filename));
            }).filter(function (localeName) {
                var has = LocaleWriter.has(localeName);
                if (!has) {
                    this.ui.writeLine(
                        chalk.red(
                            'ember-intl: \'' + localeName + '\' does not match a supported locale name.\n' +
                            'List of supported locales: https://github.com/yahoo/formatjs-extract-cldr-data/tree/master/data/main'
                        )
                    );
                }
                return has;
            }, this);
        }

        if (intlOptions.locales) {
            locales = locales.concat(intlOptions.locales);
        }

        if (locales.length) {
            trees.push(new LocaleWriter(inputTree, 'cldrs', {
                locales       : utils.uniqueByString(locales),
                pluralRules   : true,
                relativeFields: true,
                prelude       : '/*jslint eqeq: true*/\n',
                wrapEntry     : function wrapEntry(result) {
                    return 'export default ' + serialize(result) + ';';
                }
            }));
        }

        return mergeTrees(trees, { overwrite: true });
    },

    treeForPublic: function () {
        var inputTree   = this._super.treeForPublic.apply(this, arguments);
        var intlOptions = this.intlOptions;
        var options     = this.app.options;
        var outputPath  = path.join('assets', 'intl');
        var trees       = [];
        var include;

        if (options.app && options.app.intl) {
            outputPath = options.app.intl;
        }

        if (intlOptions.disablePolyfill) {
            return inputTree;
        }

        if (inputTree) {
            trees.push(inputTree);
        }

        trees.push(utils.lowercaseTree(new Funnel(path.join(intlPath, 'dist'), {
            files  : ['Intl.complete.js', 'Intl.js', 'Intl.min.js'],
            destDir: path.join(outputPath)
        })));

        if (intlOptions.locales) {
            include = utils.uniqueByString(intlOptions.locales).map(function(locale) {
                return new RegExp(locale, 'i');
            });
        }

        // only use these when using Intl.js, should not be used
        // with the native Intl API
        trees.push(utils.lowercaseTree(new Funnel(path.join(intlPath, 'locale-data', 'jsonp'), {
            destDir: path.join(outputPath, 'locales'),
            include: include
        })));

        return mergeTrees(trees, { overwrite: true });
    }
};
