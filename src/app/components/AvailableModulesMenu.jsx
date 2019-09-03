import React from 'react';
import PropTypes from 'prop-types';
import * as ModuleUtils from '../shipyard/ModuleUtils';
import TranslatedComponent from './TranslatedComponent';
import { stopCtxPropagation } from '../utils/UtilityFunctions';
import cn from 'classnames';
import { MountFixed, MountGimballed, MountTurret } from './SvgIcons';
import FuzzySearch from 'react-fuzzy';

const PRESS_THRESHOLD = 500; // mouse/touch down threshold

/*
 * Categorisation of module groups
 */
const GRPCAT = {
  'sg': 'shields',
  'bsg': 'shields',
  'psg': 'shields',
  'scb': 'shields',
  'cc': 'limpet controllers',
  'fx': 'limpet controllers',
  'hb': 'limpet controllers',
  'pc': 'limpet controllers',
  'rpl': 'limpet controllers',
  'pce': 'passenger cabins',
  'pci': 'passenger cabins',
  'pcm': 'passenger cabins',
  'pcq': 'passenger cabins',
  'fh': 'hangars',
  'pv': 'hangars',
  'fs': 'fuel',
  'ft': 'fuel',
  'hr': 'structural reinforcement',
  'mrp': 'structural reinforcement',
  'bl': 'lasers',
  'pl': 'lasers',
  'ul': 'lasers',
  'ml': 'lasers',
  'c': 'projectiles',
  'mc': 'projectiles',
  'axmc': 'experimental',
  'fc': 'projectiles',
  'rfl': 'experimental',
  'pa': 'projectiles',
  'rg': 'projectiles',
  'mr': 'ordnance',
  'axmr': 'experimental',
  'rcpl': 'experimental',
  'dtl': 'experimental',
  'tbsc': 'experimental',
  'tbem': 'experimental',
  'tbrfl': 'experimental',
  'mahr': 'experimental',
  'rsl': 'experimental',
  'tp': 'ordnance',
  'nl': 'ordnance',
  'sc': 'scanners',
  'ss': 'scanners',
  // Utilities
  'cs': 'scanners',
  'kw': 'scanners',
  'ws': 'scanners',
  'xs': 'scanners',
  'ch': 'defence',
  'po': 'defence',
  'ec': 'defence',
  'sfn': 'defence',
  // Guardian
  'gpp': 'guardian',
  'gpc': 'guardian',
  'gsrp': 'guardian',
  'ggc': 'guardian',
  'gfsb': 'guardian',
  'gmrp': 'guardian',
  'gsc': 'guardian',
  'ghrp': 'guardian',

  // Mining
  'scl': 'mining',
  'pwa': 'mining',
  'sdm': 'mining',

  // Assists
  'dc': 'flight assists',
  'sua': 'flight assists',
};
// Order here is the order in which items will be shown in the modules menu
const CATEGORIES = {
  // Internals
  'am': ['am'],
  'cr': ['cr'],
  'fi': ['fi'],
  'fuel': ['ft', 'fs'],
  'hangars': ['fh', 'pv'],
  'limpet controllers': ['cc', 'fx', 'hb', 'pc', 'rpl'],
  'passenger cabins': ['pce', 'pci', 'pcm', 'pcq'],
  'rf': ['rf'],
  'shields': ['sg', 'bsg', 'psg', 'scb'],
  'structural reinforcement': ['hr', 'mrp'],
  'flight assists': ['dc', 'sua'],

  // Hardpoints
  'lasers': ['pl', 'ul', 'bl'],
  'projectiles': ['mc', 'c', 'fc', 'pa', 'rg'],
  'ordnance': ['mr', 'tp', 'nl'],
  // Utilities
  'sb': ['sb'],
  'hs': ['hs'],
  'defence': ['ch', 'po', 'ec'],
  'scanners': ['sc', 'ss', 'cs', 'kw', 'ws'], // Overloaded with internal scanners
  // Experimental
  'experimental': ['axmc', 'axmr', 'rfl', 'tbrfl', 'tbsc', 'tbem', 'xs', 'sfn', 'rcpl', 'dtl', 'rsl', 'mahr',],

  // Guardian
  'guardian': ['gpp', 'gpd', 'gpc', 'ggc', 'gsrp', 'gfsb', 'ghrp', 'gmrp', 'gsc'],

  'mining': ['ml', 'scl', 'pwa', 'sdm', 'abl'],
};

/**
 * Available modules menu
 */
export default class AvailableModulesMenu extends TranslatedComponent {
  static propTypes = {
    modules: PropTypes.oneOfType([PropTypes.object, PropTypes.array]).isRequired,
    onSelect: PropTypes.func.isRequired,
    diffDetails: PropTypes.func,
    m: PropTypes.object,
    ship: PropTypes.object.isRequired,
    warning: PropTypes.func,
    firstSlotId: PropTypes.string,
    lastSlotId: PropTypes.string,
    activeSlotId: PropTypes.string,
    slotDiv: PropTypes.object
  };

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props);
    this._hideDiff = this._hideDiff.bind(this);
    this._showSearch = this._showSearch.bind(this);
    this.state = this._initState(props, context);
    this.slotItems = [];// Array to hold <li> refs.
  }

  /**
   * Initiate the list of available moduels
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   * @return {Object}         list: Array of React Components, currentGroup Component if any
   */
  _initState(props, context) {
    let translate = context.language.translate;
    let { m, warning, onSelect, modules, ship } = props;
    let list, currentGroup;

    let buildGroup = this._buildGroup.bind(
      this,
      ship,
      translate,
      m,
      warning,
      (m, event) => {
        this._hideDiff(event);
        onSelect(m);
      }
    );
    let fuzzy = [];
    if (modules instanceof Array) {
      list = buildGroup(modules[0].grp, modules);
    } else {
      list = [];
      // At present time slots with grouped options (Hardpoints and Internal) can be empty
      if (m) {
        let emptyId = 'empty';
        if (this.firstSlotId == null) this.firstSlotId = emptyId;
        let keyDown = this._keyDown.bind(this, onSelect);
        list.push(<div className='empty-c upp' key={emptyId} data-id={emptyId} onClick={onSelect.bind(null, null)}
                       onKeyDown={keyDown} tabIndex="0"
                       ref={slotItem => this.slotItems[emptyId] = slotItem}>{translate('empty')}</div>);
      }

      // Need to regroup the modules by our own categorisation
      let catmodules = {};
      // Pre-create to preserve ordering
      for (let cat in CATEGORIES) {
        catmodules[cat] = [];
      }
      for (let g in modules) {
        const moduleCategory = GRPCAT[g] || g;
        const existing = catmodules[moduleCategory] || [];
        catmodules[moduleCategory] = existing.concat(modules[g]);
      }

      for (let category in catmodules) {
        let categoryHeader = false;
        // Order through CATEGORIES if present
        const categories = CATEGORIES[category] || [category];
        if (categories && categories.length) {
          for (let n in categories) {
            const grp = categories[n];
            // We now have the group and the category.  We might not have any modules, though...
            if (modules[grp]) {
              // Decide if we need a category header as well as a group header
              if (categories.length === 1) {
                // Show category header instead of group header
                if (m && grp == m.grp) {
                  list.push(<div ref={(elem) => this.groupElem = elem} key={category}
                                 className={'select-category upp'}>{translate(category)}</div>);
                } else {
                  list.push(<div key={category} className={'select-category upp'}>{translate(category)}</div>);
                }
              } else {
                // Show category header as well as group header
                if (!categoryHeader) {
                  list.push(<div key={category} className={'select-category upp'}>{translate(category)}</div>);
                  categoryHeader = true;
                }
                if (m && grp == m.grp) {
                  list.push(<div ref={(elem) => this.groupElem = elem} key={grp}
                                 className={'select-group cap'}>{translate(grp)}</div>);
                } else {
                  list.push(<div key={grp} className={'select-group cap'}>{translate(grp)}</div>);
                }
              }
              list.push(buildGroup(grp, modules[grp]));
              for (const i of modules[grp]) {
                let mount = '';
                if (i.mount === 'F') {
                  mount = 'Fixed';
                } else if (i.mount === 'G') {
                  mount = 'Gimballed';
                } else if (i.mount === 'T') {
                  mount = 'Turreted';
                }
                const fuzz = { grp, m: i, name: `${i.class}${i.rating}${mount ? ' '  + mount : ''} ${translate(grp)}` };
                fuzzy.push(fuzz);
              }
            }
          }
        }
      }
    }
    let trackingFocus = false;
    return { list, currentGroup, fuzzy, trackingFocus };
  }

  /**
   * Generate React Components for Module Group
   * @param  {Ship} ship            Ship the selection is for
   * @param  {Function} translate   Translate function
   * @param  {Object} mountedModule Mounted Module
   * @param  {Function} warningFunc Warning function
   * @param  {function} onSelect    Select/Mount callback
   * @param  {string} grp           Group name
   * @param  {Array} modules        Available modules
   * @return {React.Component}      Available Module Group contents
   */
  _buildGroup(ship, translate, mountedModule, warningFunc, onSelect, grp, modules) {
    let prevClass = null, prevRating = null, prevName;
    let elems = [];

    const sortedModules = modules.sort(this._moduleOrder);

    // Calculate the number of items per class.  Used so we don't have long lists with only a few items in each row
    const tmp = sortedModules.map((v, i) => v['class']).reduce((count, cls) => {
      count[cls] = ++count[cls] || 1;
      return count;
    }, {});
    const itemsPerClass = Math.max.apply(null, Object.keys(tmp).map(key => tmp[key]));

    let itemsOnThisRow = 0;
    for (let i = 0; i < sortedModules.length; i++) {
      let m = sortedModules[i];
      let mount = null;
      let disabled = false;
      prevName = m.name;
      if (ModuleUtils.isShieldGenerator(m.grp)) {
        // Shield generators care about maximum hull mass
        disabled = ship.hullMass > m.maxmass;
      // If the mounted module is experimental as well, we can replace it so
      // the maximum does not apply
      } else if (m.experimental && (!mountedModule || !mountedModule.experimental)) {
        disabled = 4 <= ship.hardpoints.filter(o => o.m && o.m.experimental).length;
      }
      let active = mountedModule && mountedModule.id === m.id;
      let classes = cn(m.name ? 'lc' : 'c', {
        warning: !disabled && warningFunc && warningFunc(m),
        active,
        disabled
      });
      let eventHandlers;

      if (disabled) {
        eventHandlers = {
          onKeyDown: this._keyDown.bind(this, null),
          onKeyUp: this._keyUp.bind(this, null)

        };
      } else {
        /**
         * Get the ids of the first and last <li> elements in the <ul> that are focusable (i.e. are not active or disabled)
         * Will be used to keep focus inside the <ul> on Tab and Shift-Tab while it is visible
         */
        if (this.firstSlotId == null) this.firstSlotId = sortedModules[i].id;
        if (active) this.activeSlotId = sortedModules[i].id;
        this.lastSlotId = sortedModules[i].id;

        let showDiff = this._showDiff.bind(this, mountedModule, m);
        let select = onSelect.bind(null, m);

        eventHandlers = {
          onMouseEnter: this._over.bind(this, showDiff),
          onTouchStart: this._touchStart.bind(this, showDiff),
          onTouchEnd: this._touchEnd.bind(this, select),
          onMouseLeave: this._hideDiff,
          onClick: select,
          onKeyDown: this._keyDown.bind(this, select),
          onKeyUp: this._keyUp.bind(this, select)
        };
      }

      switch (m.mount) {
        case 'F':
          mount = <MountFixed className={'lg'}/>;
          break;
        case 'G':
          mount = <MountGimballed className={'lg'}/>;
          break;
        case 'T':
          mount = <MountTurret className={'lg'}/>;
          break;
      }
      if (m.name && m.name === prevName) {
        // elems.push(<br key={'b' + m.grp + i} />);
        itemsOnThisRow = 0;
      }
      if (itemsOnThisRow == 6 || i > 0 && sortedModules.length > 3 && itemsPerClass > 2 && m.class != prevClass && (m.rating != prevRating || m.mount)) {
        elems.push(<br key={'b' + m.grp + i}/>);
        itemsOnThisRow = 0;
      }
      let tbIdx = (classes.indexOf('disabled') < 0) ? 0 : undefined;
      elems.push(
        <li key={m.id} data-id={m.id} className={classes} {...eventHandlers} tabIndex={tbIdx}
            ref={slotItem => this.slotItems[m.id] = slotItem}>
          {mount}
          {(mount ? ' ' : '') + m.class + m.rating + (m.missile ? '/' + m.missile : '') + (m.name ? ' ' + translate(m.name) : '')}
        </li>
      );

      itemsOnThisRow++;
      prevClass = m.class;
      prevRating = m.rating;
      prevName = m.name;
    }
    return <ul key={'modules' + grp}>{elems}</ul>;
  }

  /**
   * Generate tooltip content for the difference between the
   * mounted module and the hovered modules
   * @param  {Object} mm    The module mounet currently
   * @param  {Object} m     The hovered module
   * @param  {DOMRect} rect DOMRect for target element
   */
  _showDiff(mm, m, rect) {
    if (this.props.diffDetails) {
      this.touchTimeout = null;
      this.context.tooltip(this.props.diffDetails(m, mm), rect);
    }
  }

  /**
   * Generate tooltip content for the difference between the
   * mounted module and the hovered modules
   */
  _showSearch() {
    if (this.props.modules instanceof Array) {
      return;
    }
    return (
      <FuzzySearch
        list={this.state.fuzzy}
        keys={['grp', 'name']}
        tokenize={true}
        className={'input'}
        width={'100%'}
        style={{ padding: 0 }}
        onSelect={e => this.props.onSelect.bind(null, e.m)()}
        resultsTemplate={(props, state, styles, clickHandler) => {
          return state.results.map((val, i) => {
            return (
              <div
                key={i}
                className={'lc'}
                onClick={() => clickHandler(i)}
              >
                {val.name}
              </div>
            );
          });
        }}
      />
    );
  }

  /**
   * Mouse over diff handler
   * @param  {Function} showDiff diff tooltip callback
   * @param  {SyntheticEvent} event Event
   */
  _over(showDiff, event) {
    event.preventDefault();
    showDiff(event.currentTarget.getBoundingClientRect());
  }

  /**
   * Toucch Start - Show diff after press, otherwise treat as tap
   * @param  {Function} showDiff diff tooltip callback
   * @param  {SyntheticEvent} event Event
   */
  _touchStart(showDiff, event) {
    event.preventDefault();
    let rect = event.currentTarget.getBoundingClientRect();
    this.touchTimeout = setTimeout(showDiff.bind(this, rect), PRESS_THRESHOLD);
  }

  /**
   * Touch End - Select module on tap
   * @param  {Function} select Select module callback
   * @param  {SyntheticEvent} event Event
   */
  _touchEnd(select, event) {
    event.preventDefault();
    if (this.touchTimeout !== null) {  // If timeout has not fired (been nulled out) yet
      select();
    }
    this._hideDiff();
  }

  /**
   * Key down - select module on Enter key, move to next/previous module on Tab/Shift-Tab, close on Esc
   * @param  {Function} select Select module callback
   * @param  {SyntheticEvent} event Event
   */
  _keyDown(select, event) {
    let className = event.currentTarget.attributes['class'].value;
    if (event.key == 'Enter' && className.indexOf('disabled') < 0 && className.indexOf('active') < 0) {
      select();
      return;
    }
    let elemId = event.currentTarget.attributes['data-id'].value;
    if (className.indexOf('disabled') < 0 && event.key == 'Tab') {
      if (event.shiftKey && elemId == this.firstSlotId) {
        event.preventDefault();
        this.slotItems[this.lastSlotId].focus();
        return;
      }
      if (!event.shiftKey && elemId == this.lastSlotId) {
        event.preventDefault();
        this.slotItems[this.firstSlotId].focus();
        return;
      }
    }
  }

  /**
   * Key Up
   * @param {Function}  select Select module callback
   * @param {SytheticEvent} event Event
   */
  _keyUp(select, event) {
    // nothing here yet
  }

  /**
   * Hide diff tooltip
   * @param  {SyntheticEvent} event Event
   */
  _hideDiff(event) {
    clearTimeout(this.touchTimeout);
    this.touchTimeout = null;
    this.context.tooltip();
  }

  /**
   * Order two modules suitably for display in module selection
   * @param  {Object} a the first module
   * @param  {Object} b the second module
   * @return {int}      -1 if the first module should go first, 1 if the second module should go first
   */
  _moduleOrder(a, b) {
    // Named modules go last
    if (!a.name && b.name) {
      return -1;
    }
    if (a.name && !b.name) {
      return 1;
    }
    // Class ordered from highest (8) to lowest (1)
    if (a.class < b.class) {
      return 1;
    }
    if (a.class > b.class) {
      return -1;
    }
    // Mount type, if applicable
    if (a.mount && b.mount && a.mount !== b.mount) {
      if (a.mount === 'F' || (a.mount === 'G' && b.mount === 'T')) {
        return -1;
      } else {
        return 1;
      }
    }
    // Rating ordered from highest (A) to lowest (E)
    if (a.rating < b.rating) {
      return -1;
    }
    if (a.rating > b.rating) {
      return 1;
    }
    // Do not attempt to order by name at this point, as that mucks up the order of armour
    return 0;
  }

  /**
   * Scroll to mounted (if it exists) module group on mount
   */
  componentDidMount() {
    if (this.groupElem) {  // Scroll to currently selected group
      this.node.scrollTop = this.groupElem.offsetTop;
    }
    /**
     * Set focus on active or first slot element, if applicable.
     */
    if (this.slotItems[this.activeSlotId]) {
      this.slotItems[this.activeSlotId].focus();
    } else if (this.slotItems[this.firstSlotId]) {
      this.slotItems[this.firstSlotId].focus();
    }
  }

  /**
   * Handle focus if the component updates
   *
   */
  componentWillUnmount() {
    if (this.props.slotDiv) {
      this.props.slotDiv.focus();
    }
  }

  /**
   * Update state based on property and context changes
   * @param  {Object} nextProps   Incoming/Next properties
   * @param  {Object} nextContext Incoming/Next conext
   */
  componentWillReceiveProps(nextProps, nextContext) {
    this.setState(this._initState(nextProps, nextContext));
  }

  /**
   * Render the list
   * @return {React.Component} List
   */
  render() {
    return (
      <div ref={node => this.node = node}
           className={cn('select', this.props.className)}
           onScroll={this._hideDiff}
           onClick={(e) => e.stopPropagation()}
           onContextMenu={stopCtxPropagation}
      >
        {this._showSearch()}
        {this.state.list}
      </div>
    );
  }
}
