(function(exports){

    var DORUtils = {
        getPosition: function(element) {
            return {
                top: element.getBoundingClientRect().top + window.pageYOffset,
                left: element.getBoundingClientRect().left + window.pageXOffset,
            };
        },
        setCss: function(element, styles) {
            for(name in styles) {
                styles[name]
                element.style[name] = styles[name];
            }
        },
        getElement: function(selector) {
            return document.querySelector(selector);
        },
        hideElement:function(element) {
            this.setCss(element, {display: 'none'});
        },
        getViewport:function () {
            return {
                left : window.pageXOffset || document.documentElement.scrollLeft,
                top : window.pageYOffset || document.documentElement.scrollTop,
                width : window.innerWidth || document.documentElement.clientWidth,
                height : window.innerHeight || document.documentElement.clientHeight
            };
        },
    };

    /**
     * Like Interface
     */
    var IDORPricker = function() {

        /**
         * @param {Date} date
         */
        this.addDate = function(date) {};

        /**
         * @param {Date} date
         * @return {boolean}
         */
        this.isDateSelected = function(date) {}
    };

    var DORPrickerRange = function(state, isDateSpecial, isDateDisabled) {
        this.state = typeof state === 'undefined' ? {from: null, to: null} : {from: new Date(state.from.setHours(0,0,0,0)), to: new Date(state.to.setHours(0,0,0,0))};
        this.isDateSpecial = typeof isDateSpecial === 'function' ? isDateSpecial : function(date){
            return false;
        };
        this.isDateDisabled = typeof isDateDisabled === 'function' ? isDateDisabled : function(date){
            return false;
        };

        /**
         * @param {Date} date
         */
        this.addDate = function(date) {
            if(this.state.from !== null && this.state.from.getTime() === this.state.to.getTime()) {
                date < this.state.from ? this.state.from = date : this.state.to = date;
            } else {
                this.state.from = this.state.to = date;
            }
        };

        /**
         * @param {Date} date
         * @return {boolean}
         */
        this.isDateSelected = function(date) {
            return this.state.from <= date && date <= this.state.to;
        };

        /**
         * @return {{from: Date, to: Date}}
         */
        this.getSelectedDate = function() {
            return {
                from: new Date(this.state.from),
                to: new Date(this.state.to),
            }
        };
    };

    var DORPrickerSingle = function(date, isDateSpecial, isDateDisabled) {
        this.date = typeof date === 'undefined' ? null : new Date(date.setHours(0,0,0,0));
        this.isDateSpecial = typeof isDateSpecial === 'function' ? isDateSpecial : function(date){
            return false;
        };
        this.isDateDisabled = typeof isDateDisabled === 'function' ? isDateDisabled : function(date){
            return false;
        };

        /**
         * @param {Date} date
         */
        this.addDate = function(date) {
            this.date = date;
        };

        /**
         * @param {Date} date
         * @return {boolean}
         */
        this.isDateSelected = function(date) {
            return this.date instanceof Date  ? this.date.getTime() === date.getTime() : false;
        };

        /**
         * @return {Date}
         */
        this.getSelectedDate = function() {
            return new Date(this.date);
        };
    };

    var DORPrickerMultiple = function(dates) {
        this.dates = {};
        if(dates instanceof Array) {
            dates.forEach(function(date){
                this.dates[date.toDateString()] = date;
            }.bind(this));
        }

        /**
         * It is a little dirty but simplier than handle array...
         * @param {Date} date
         */
        this.addDate = function(date) {
            if(typeof this.dates[date.toDateString()] !== 'undefined') {
                delete this.dates[date.toDateString()];
            } else {
                this.dates[date.toDateString()] = date;
            }
        };

        /**
         * @param {Date} date
         * @return {boolean}
         */
        this.isDateSelected = function(date) {
            return typeof this.dates[date.toDateString()] !== 'undefined';
        };

        /**
         * @return {Date[]}
         */
        this.getSelectedDate = function() {
            var dates = [];
            for(date in this.dates) {
                dates.push(this.dates[date]);
            }
            return dates;
        };
    };

    var DOR = function(Utils) {
        this.holderElement;
        this.tableElement;
        this.datePicker;
        this.currentDate;
        this.config;
        this.afterPickDate;
        this.afterInit;
        this.setPositionToContainerReference;//need store reference for removing eventListener
        this.eventHideCalendarReference;//need store reference for removing eventListener
        this.utils = Utils;
        this.defaultConfig = {
            prevButton: '<svg style="width: 20px;height: 20px" viewBox="0 0 200 200"><polygon points="10 100,190 10,190 190" style="fill:#666;stroke-linejoin: round;stroke:#666;stroke-width:20;" />&#9664;</svg>', 
            nextButton: '<svg style="width: 20px;height: 20px" viewBox="0 0 200 200"><polygon points="10 10,190 100,10 190" style="fill:#666;stroke-linejoin: round;stroke:#666;stroke-width:20;" />&#9664;</svg>', 
            weekStartsWithMonday: true,
            tdSelectedCss: {
                background: '#42b0f3',
                color: '#f9f9f9',
            },
            tdCss: {
                width: '40px',
                height: '40px',
                textAlign: 'center',
            },
            spanSpecialCss: {
                width: '40px',
                height: '40px',
                background: 'rgba(0, 128, 0, 0.6)',
                display: 'block',
                lineHeight: '40px',
                color: '#f9f9f9',
            },
            spanDisabledCss: {
                width: '40px',
                height: '40px',
                background: 'rgba(204, 204, 204, 0.6)',
                display: 'block',
                lineHeight: '40px',
                color: '#f9f9f9',
            },
            tableCss: {
                borderCollapse: 'collapse',
                borderSpacing: 0,
            },
            containerCss: {
                background: '#f9f9f9',
                border: '1px solid #666',
                color: '#666',
                borderRadius: '3px',
                padding: '8px',
            },
            i18n: {
                weekdays:  ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'],
                months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
                monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            },
        };
    };

    DOR.prototype._constructor = function(holderElement, userConfig, datePicker, currentDate, afterInit, afterPickDate) {
        if(!datePicker.hasOwnProperty('addDate') || typeof datePicker.addDate !== 'function'
            || !datePicker.hasOwnProperty('isDateSelected' || typeof datePicker.isDateSelected !== 'function') 
        ) {
            throw new Error('Expecting methods addDate and isDateSelected in ' + datePicker.constructor);
        }
        this.holderElement = holderElement;
        this.tableElement = document.createElement('table');
        this.containerElement = document.createElement('div');
        this.datePicker = datePicker;
        this.currentDate = new Date(currentDate).setHours(0,0,0,0);
        this.afterPickDate = afterPickDate;
        this.afterInit = afterInit;
        this.init(userConfig);
        this.render();
        this.afterInit(this.getSelectedDate(), this.parseToISODate);
    };

    //https://esdiscuss.org/topic/better-way-to-maintain-this-reference-on-event-listener-functions
    DOR.prototype.handleEvent = function(e){
        if(e.type === 'mousedown') {
            this.eventHideCalendar(e);
        }
        if(e.type === 'resize') {
            this.setPositionToContainer(e);
        }
    };

    DOR.prototype.init = function(userConfig) {
        this.config = Object.assign(this.defaultConfig, userConfig);
        this.holderElement.addEventListener('click', this.eventShowCalendar.bind(this), false);// add click event listener
        this.tableElement.setAttribute('cellpadding','0');
        this.utils.setCss(this.containerElement, {
            position: 'absolute',
            display: 'none',
            transition: 'opacity 0.5s ease 0s',
            opacity: 0,
        });
    };

    /**
     * Return config Object as immutable
     * @return {Object}
     */
    DOR.prototype.getConfig = function() {
        return JSON.parse(JSON.stringify(this.config));
    };

    DOR.prototype.createTableNode = function() {
        var currentDate = this.getCurrentDate();

        var firstDayOfMonth = this.getFirstDayOfMonth(currentDate);
        var monthDays = this.getDaysOfTable(currentDate);

        var table = this.getTableElement();
        table.innerHTML = '';

        this.utils.setCss(table, this.getTableCss());
        var tr;
        var td;
        var span;
        var weekdays = this.getI18n().weekdays;
        var months = this.getI18n().months;

        tr = document.createElement('tr');

        td = document.createElement('td');
        td.innerHTML = this.getPrevButton();
        td.addEventListener('click', this.eventPrevMonth.bind(this), false);// add click event listener
        this.utils.setCss(td, this.getTdCss());
        tr.appendChild(td);

        td = document.createElement('td');
        td.appendChild(document.createTextNode(months[currentDate.getMonth()] +', '+currentDate.getFullYear()));
        td.setAttribute('colspan', 5);
        this.utils.setCss(td, this.getTdCss());
        tr.appendChild(td);

        td = document.createElement('td');
        td.innerHTML = this.getNextButton();
        td.addEventListener('click', this.eventNextMonth.bind(this), false);// add click event listener
        this.utils.setCss(td, this.getTdCss());
        tr.appendChild(td);

        table.appendChild(tr);

        this.isWeekStartsWithMonday() ? weekdays.push(weekdays.shift()) : false;
        tr = document.createElement('tr');
        weekdays.forEach(function(name, index) {
            td = document.createElement('td');
            td.appendChild(document.createTextNode(name));
            this.utils.setCss(td, this.getTdCss());
            tr.appendChild(td);
        }.bind(this));
        table.appendChild(tr);

        monthDays.forEach(function(date, index) {
            tr = (index + 1) % 7 === 1 ? document.createElement('tr') : tr;//create <tr> if first day of the week
            date.setHours(0,0,0,0);

            td = document.createElement('td');
            span = document.createElement('span');
            if(firstDayOfMonth.getMonth() === date.getMonth()){
                this.getDatePicker().isDateSpecial(date) ? this.utils.setCss(span, this.getSpanSpecialCss()) : false;// if special date add special css
                this.getDatePicker().isDateDisabled(date) ? this.utils.setCss(span, this.getSpanDisabledCss()) : false;// if disabled date add disabled css
                this.getDatePicker().isDateSelected(date) ? this.utils.setCss(td, this.getTdSelectedCss()) : false;// if selected date add selected css
                !this.getDatePicker().isDateDisabled(date) ? td.addEventListener('click', this.eventPickDay.bind(this, date), false) : false;// add click event listener if not disabled date
                span.appendChild(document.createTextNode(date.getDate()));
                td.appendChild(span);
            }
            this.utils.setCss(td, this.getTdCss());
            tr.appendChild(td);
            (index + 1) % 7 === 0 ? table.appendChild(tr) : false;//last day of the week
        }.bind(this));

        return table;
    };

    DOR.prototype.eventPickDay = function(date, event) {
        this.getDatePicker().addDate(date);
        this.render();
        this.afterPickDate(this.getSelectedDate(), this.parseToISODate, event);
    };

    DOR.prototype.eventPrevMonth = function(event) {
        var currentDate = this.getCurrentDate();
        var prevMonth = new Date(currentDate.setMonth(currentDate.getMonth() - 1));
        this.setCurrentDate(prevMonth);
        this.render();
    };

    DOR.prototype.eventNextMonth = function(event) {
        var currentDate = this.getCurrentDate();
        var nextMonth = new Date(currentDate.setMonth(currentDate.getMonth() + 1));
        this.setCurrentDate(nextMonth);
        this.render();
    };

    DOR.prototype.eventShowCalendar = function() {
        this.setPositionToContainer();

        this.utils.setCss(this.containerElement, {
            display: 'block',
        });

        setTimeout(function(){
            this.utils.setCss(this.containerElement, {
                opacity: 1,
            });
        }.bind(this), 0);//has to be in another thread

        window.addEventListener('resize', this);// check this.eventHandler
        document.addEventListener('mousedown', this);//check this.eventHandler
    };

    DOR.prototype.setPositionToContainer = function () {
        var viewPort = this.utils.getViewport();

        var containerHeight = this.containerElement.offsetHeight;
        var holderPositionTop = this.utils.getPosition(this.holderElement).top;
        var holderPositionLeft = this.utils.getPosition(this.holderElement).left;
        var holderHeight = this.holderElement.offsetHeight;

        var containerPositionTop = holderPositionTop + holderHeight;
        var containerPositionLeft = holderPositionLeft;

        if (containerPositionTop + containerHeight > viewPort.top + viewPort.height) {
            containerPositionTop = holderPositionTop - containerHeight;
        }
        if (containerPositionTop < viewPort.top) {
            containerPositionTop = holderPositionTop + holderHeight;
        }

        this.utils.setCss(this.containerElement, {
            top: containerPositionTop + 'px',
            left: containerPositionLeft + 'px'
        });
    };

    DOR.prototype.eventHideCalendar = function (event) {
        if (event.target !== this.holderElement && !this.containerElement.contains(event.target)) {
            this.hide();
        }
    };

    DOR.prototype.hide = function () {
        this.utils.setCss(this.containerElement, {
            opacity: 0,
        });
        setTimeout(function(){
            this.utils.setCss(this.containerElement, {
                display: 'none',
            });
        }.bind(this), 500);
        window.removeEventListener('resize', this);
        document.removeEventListener('mousedown', this);
    };

    DOR.prototype.getTableElement = function () {
        return this.tableElement;
    };

    /**
     * Return the first day of the month of the given Date. Without mutation
     * @param {Date} date
     * @return {Date}
     */
    DOR.prototype.getFirstDayOfMonth = function(date) {
        return new Date(new Date(new Date(date).setDate(1)).setMinutes(date.getTimezoneOffset() * -1));
    };

    /**
     * Return the first day in the table(42 days) without mutation
     * @param {Date} date
     * @return {Date}
     */
    DOR.prototype.getFirstDayOfTable = function(date) {
        var firstDayOfMonth = this.getFirstDayOfMonth(date);
        var dayOfWeek = numberOfDaysGoBack = firstDayOfMonth.getDay();
        if(this.isWeekStartsWithMonday()) {
            numberOfDaysGoBack = dayOfWeek === 0 ? 7 - 1 : dayOfWeek - 1;
        }
        numberOfDaysGoBack--;// Because for some reason set Yesterday is Date.setDate(0) and set Today is Date.setDate(1)...
        return new Date(new Date(firstDayOfMonth).setDate(numberOfDaysGoBack * -1));
    };

    /**
     * Return array of Dates instances in the table. Without mutation
     * @param {Data} date
     * @return {Date[]}
     */
    DOR.prototype.getDaysOfTable = function(date) {
        var firstDayOfTable = this.getFirstDayOfTable(date);
        var days = [];
        for(i = 0; i < 42; i++) {
            days.push(i === 0 ? new Date(firstDayOfTable) : new Date(firstDayOfTable.setDate(firstDayOfTable.getDate() + 1)));
        }
        return days;
    };

    /**
     * Return if week starts with the Monday
     * @return {boolean}
     */
    DOR.prototype.isWeekStartsWithMonday = function() {
        return this.getConfig().weekStartsWithMonday;
    };

    /**
     * Return current Date as immutable
     * @return {Date}
     */
    DOR.prototype.getCurrentDate = function() {
        return new Date(this.currentDate);
    };

    /**
     * Return current Date as immutable
     * @return {Date}
     */
    DOR.prototype.setCurrentDate = function(date) {
        this.currentDate = date;
    };

    /**
     * Return td css as immutable
     * @return {Object}
     */
    DOR.prototype.getTdCss = function() {
        return  this.getConfig().tdCss;
    };

    /**
     * Return td selected css as immutable
     * @return {Object}
     */
    DOR.prototype.getTdSelectedCss = function() {
        return  this.getConfig().tdSelectedCss;
    };

    /**
     * Return span special css as immutable
     * @return {Object}
     */
    DOR.prototype.getSpanSpecialCss = function() {
        return  this.getConfig().spanSpecialCss;
    };

    /**
     * Return span disabled css as immutable
     * @return {Object}
     */
    DOR.prototype.getSpanDisabledCss = function() {
        return  this.getConfig().spanDisabledCss;
    };

    /**
     * Return table css as immutable
     * @return {Object}
     */
    DOR.prototype.getTableCss = function() {
        return this.getConfig().tableCss;
    };

    /**
     * Return table css as immutable
     * @return {Object}
     */
    DOR.prototype.getContainerCss = function() {
        return this.getConfig().containerCss;
    };

    /**
     * Return internationalization as immutable
     * @return {Object}
     */
    DOR.prototype.getI18n = function() {
        return this.getConfig().i18n;
    };

    /**
     * Return HTML string for innerHtml;
     * @return {String}
     */
    DOR.prototype.getPrevButton = function() {
        return this.config.prevButton;
    };

    /**
     * Return HTML string for innerHtml;
     * @return {String}
     */
    DOR.prototype.getNextButton = function() {
        return this.getConfig().nextButton;
    };

    /**
     * Return date pricker mutable is required
     * @return {Object} IDORPicker
     */
    DOR.prototype.getDatePicker = function() {
        return this.datePicker;
    };

    /**
     * Return date pricker mutable is required
     * @return {Object} IDORPicker
     */
    DOR.prototype.getSelectedDate = function() {
        return this.getDatePicker().getSelectedDate();
    };

    DOR.prototype.render = function() {
        var table = this.createTableNode();
        this.containerElement.appendChild(table);
        this.utils.setCss(this.containerElement, this.getContainerCss());
        document.body.appendChild(this.containerElement);
    };

    DOR.prototype.parseToISODate = function(date) {
        var year = date.getFullYear();
        var month = (date.getMonth()+1) < 10 ? '0' + (date.getMonth()+1) : (date.getMonth()+1);
        var day = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
        return (year + '-' + month + '-' + day);
    };

    var DORFactory = {
        createCalendar: function(holder, userConfig) {
            var holderElement =  holder.nodeType === Node.ELEMENT_NODE ? holder : document.querySelector(holder);
            userConfig =  typeof userConfig === 'undefined' ? {} : userConfig;
          
            var currentDate = typeof userConfig.currentDate === 'undefined' ? new Date() : new Date(userConfig.currentDate);
            delete userConfig.currentDate;

            var isDateSpecial = typeof userConfig.isDateSpecial === 'function' ? userConfig.isDateSpecial : function(){return false};
            delete userConfig.isDateSpecial;

            var isDateDisabled = typeof userConfig.isDateDisabled === 'function' ? userConfig.isDateDisabled : function(){return false};
            delete userConfig.isDateDisabled;
           
            var datePicker;
            if(typeof userConfig.type === 'undefined' || userConfig.type === 'single') {
                datePicker =  DORFactory.createSingle(userConfig.datePreselected, isDateSpecial, isDateDisabled);
            } else if(userConfig.type === 'range') {
                datePicker =  DORFactory.createRange(userConfig.datePreselected, isDateSpecial, isDateDisabled);
            } else if(userConfig.type === 'multi') {
                datePicker =  DORFactory.createMultiple(userConfig.datePreselected, isDateSpecial, isDateDisabled);
            } else {
                throw new Error('Unexpected type of date picker class');
            }
            delete userConfig.type;
            delete userConfig.datePreselected;

            var afterInit = typeof userConfig.afterInit === 'function' ? userConfig.afterInit : function(){};
            delete userConfig.afterInit;

            var afterPickDate = typeof userConfig.afterPickDate === 'function' ? userConfig.afterPickDate : function(){};
            delete userConfig.afterPickDate;

            var instance = new DOR(DORUtils);
            instance._constructor(holderElement, userConfig, datePicker, currentDate, afterInit, afterPickDate);
            return instance;
        },
        createSingle: function(date, isDateSpecial, isDateDisabled) {
            return new DORPrickerSingle(date, isDateSpecial, isDateDisabled);
        },
        createRange: function(state, isDateSpecial, isDateDisabled) {
            return new DORPrickerRange(state, isDateSpecial, isDateDisabled);
        },
        createMultiple: function(dates, isDateSpecial, isDateDisabled) {
            return new DORPrickerMultiple(dates, isDateSpecial, isDateDisabled);
        },
    };



// Polyfill - Object assign - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign#Polyfill
if (typeof Object.assign != 'function') {
        // Must be writable: true, enumerable: false, configurable: true
        Object.defineProperty(Object, 'assign', {
            value: function assign(target, varArgs) { // .length of function is 2
                'use strict';
                if (target == null) { // TypeError if undefined or null
                    throw new TypeError('Cannot convert undefined or null to object');
                }
                var to = Object(target);
                for (var index = 1; index < arguments.length; index++) {
                    var nextSource = arguments[index];
                    if (nextSource != null) { // Skip over if undefined or null
                        for (var nextKey in nextSource) {
                            // Avoid bugs when hasOwnProperty is shadowed
                            if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                                to[nextKey] = nextSource[nextKey];
                            }
                        }
                    }
                }
                return to;
            },
            writable: true,
            configurable: true
        });
    };

    exports.createCalendar = DORFactory.createCalendar;
    exports.createSingle = DORFactory.createSingle;
    exports.createRange = DORFactory.createRange;
    exports.createMultiple  = DORFactory.createMultiple;
    exports.iWantHackDOR = function() {
        return DOR;
    };
})(typeof exports === 'undefined'? this['DORFactory']={}: exports);
