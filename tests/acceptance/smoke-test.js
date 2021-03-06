import Ember from 'ember';
import { module, test } from 'qunit';
import startApp from '../helpers/start-app';

let application;

const { run:emberRun } = Ember;

function contains(selector, string) {
    const element = find(selector)[0];

    if (!element) {
        return ok(false, `can't find element: ${selector}`);
    }

    const text = element.textContent || element.innerText;
    return equal(text.replace(/^\s+|\s+$/g, ''), string);
}

module('Acceptance: Smoke', {
    beforeEach() {
        application = startApp();
    },
    afterEach() {
        if (application) {
            emberRun(application, 'destroy');
        }
    }
});

test('format-number', () => {
    visit('/smoke');

    andThen(() => {
        contains('.format-number', '€1,000.00');
    });
});

test('format-date', () => {
    visit('/smoke');

    andThen(() => {
        contains('.format-date', '1/23/2014');
    });
});

test('format-time', () => {
    visit('/smoke');

    andThen(() => {
        contains('.format-time', '18:00:44');
    });
});

test('format-relative', () => {
    visit('/smoke');

    andThen(() => {
        contains('.format-relative', 'yesterday');
    });
});
