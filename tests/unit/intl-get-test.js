/**
 * Copyright 2015, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */

import Ember from 'ember';
import { moduleFor, test } from 'ember-qunit';
import hbs from 'htmlbars-inline-precompile';
import Translation from 'ember-intl/models/translation';
import { runAppend, runDestroy } from '../helpers/run-append';
import createIntlBlock from '../helpers/create-intl-block';
import intlGetHelper from '../../helpers/intl-get';
import modernHelperTest from '../helpers/test';

const { run:emberRun } = Ember;
let view;

moduleFor('helper:intl-get', {
    needs: ['service:intl', 'ember-intl@adapter:-intl-adapter'],
    beforeEach() {
        this.container.register('ember-intl@translation:en-us', Translation.extend({
            greeting: 'Hello'
        }));

        this.container.register('ember-intl@translation:fr-fr', Translation.extend({
            greeting: 'Bonjour'
        }));

        this.render = createIntlBlock(this.container);
    },
    afterEach() {
        runDestroy(view);
    }
});

test('exists', function(assert) {
    assert.expect(1);
    assert.ok(intlGetHelper);
});

test('should throw if called with out a value', function(assert) {
    assert.expect(1);
    view = this.render(hbs`{{intl-get}}`);

    try {
        runAppend(view);
    }
    catch (ex) {
        assert.ok(ex);
    }
});

modernHelperTest('should recompute on intl locale change in >= 1.13.0', function(assert) {
    assert.expect(1);

    const recomputeFn = intlGetHelper.proto().recompute;
    const service     = this.container.lookup('service:intl');
    let triggered     = 0;

    intlGetHelper.reopen({
        recompute() {
            triggered++;
        }
    });

    view = this.render(hbs`{{intl-get "greeting"}}`, 'en-us');
    runAppend(view);

    emberRun(() => {
        service.setLocale('fr-fr');
        service.setLocale('en-us');
        assert.equal(triggered, 2);
    });

    // restore original function
    intlGetHelper.reopen({ recompute: recomputeFn });
});
