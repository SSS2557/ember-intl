/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

import Ember from 'ember';
import Translation from './translation';

const { Logger:logger } = Ember;

export default Translation.extend({
    init() {
        logger.warn('`ember-intl/models/locale` is deprecated in favor of `ember-intl/models/translation`');
    }
});
