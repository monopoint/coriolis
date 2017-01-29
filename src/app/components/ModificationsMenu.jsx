import React from 'react';
import * as _ from 'lodash';
import { findDOMNode } from 'react-dom';
import TranslatedComponent from './TranslatedComponent';
import { isEmpty, stopCtxPropagation } from '../utils/UtilityFunctions';
import cn from 'classnames';
import { MountFixed, MountGimballed, MountTurret } from './SvgIcons';
import { Modifications } from 'coriolis-data/dist';
import Modification from './Modification';

/**
 * Modifications menu
 */
export default class ModificationsMenu extends TranslatedComponent {

  static propTypes = {
    ship: React.PropTypes.object.isRequired,
    m: React.PropTypes.object.isRequired,
    onChange: React.PropTypes.func.isRequired
  };

  /**
   * Constructor
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   */
  constructor(props, context) {
    super(props);
    this.state = this._initState(props, context);

    this._toggleBlueprintsMenu = this._toggleBlueprintsMenu.bind(this);
    this._toggleSpecialsMenu = this._toggleSpecialsMenu.bind(this);
    this._rollWorst = this._rollWorst.bind(this);
    this._rollRandom = this._rollRandom.bind(this);
    this._rollAverage = this._rollAverage.bind(this);
    this._rollBest = this._rollBest.bind(this);
    this._reset = this._reset.bind(this);
  }

  /**
   * Initialise state
   * @param  {Object} props   React Component properties
   * @param  {Object} context React Component context
   * @return {Object}         list: Array of React Components
   */
  _initState(props, context) {
    let { m, onChange, ship } = props;
    const { language, tooltip, termtip } = context;
    const translate = language.translate;

    // Set up the blueprints
    let blueprints = [];
    for (const blueprintName in Modifications.modules[m.grp].blueprints) {
      for (const grade of Modifications.modules[m.grp].blueprints[blueprintName]) {
        const close = this._blueprintSelected.bind(this, Modifications.blueprints[blueprintName].id, grade);
        const key = blueprintName + ':' + grade;
        blueprints.push(<div style={{ cursor: 'pointer' }} key={ key } onClick={ close }>{translate(Modifications.blueprints[blueprintName].name + ' grade ' + grade)}</div>);
      }
    }

    // Set up the special effects
    let specials = [];
    if (Modifications.modules[m.grp].specials && Modifications.modules[m.grp].specials.length > 0) {
      const close = this._specialSelected.bind(this, null);
      specials.push(<div style={{ cursor: 'pointer' }} key={ 'none' } onClick={ close }>{translate('PHRASE_NO_SPECIAL')}</div>);
      for (const specialName of Modifications.modules[m.grp].specials) {
        const close = this._specialSelected.bind(this, specialName);
        specials.push(<div style={{ cursor: 'pointer' }} key={ specialName } onClick={ close }>{translate(Modifications.specials[specialName].name)}</div>);
      }
    }

    // Set up the modifications
    const modifications = this._setModifications(props);

    const blueprintMenuOpened = false;
    const specialMenuOpened = false;

    return { blueprintMenuOpened, blueprints, modifications, specialMenuOpened, specials };
  }

  /**
   * Initialise the modifications
   * @param  {Object} props   React Component properties
   * @return {Object}         list: Array of React Components
   */
  _setModifications(props) {
    const { m, onChange, ship } = props;
    let modifications = [];
    for (const modName of Modifications.modules[m.grp].modifications) {
      if (Modifications.modifications[modName].type === 'percentage' || Modifications.modifications[modName].type === 'numeric') {
        const key = modName + (m.getModValue(modName) / 100 || 0);
        modifications.push(<Modification key={ key } ship={ ship } m={ m } name={ modName } value={ m.getModValue(modName) / 100 || 0 } onChange={ onChange }/>);
      }
    }
    return modifications;
  }

  /**
   * Toggle the blueprints menu
   */
  _toggleBlueprintsMenu() {
    const blueprintMenuOpened = !this.state.blueprintMenuOpened;
    this.setState({ blueprintMenuOpened });
  }

  /**
   * Activated when a blueprint is selected
   * @param  {int} blueprintId The ID of the selected blueprint
   * @param  {int} grade       The grade of the selected blueprint
   */
  _blueprintSelected(blueprintId, grade) {
    const { m } = this.props;
    const blueprint = Object.assign({}, _.find(Modifications.blueprints, function(o) { return o.id === blueprintId; }));
    blueprint.grade = grade;
    m.blueprint = blueprint;

    const blueprintMenuOpened = false;
    this.setState({ blueprintMenuOpened });
    this.props.onChange();
  }

  /**
   * Toggle the specials menu
   */
  _toggleSpecialsMenu() {
    const specialMenuOpened = !this.state.specialMenuOpened;
    this.setState({ specialMenuOpened });
  }

  /**
   * Activated when a special is selected
   * @param  {int} special     The name of the selected special
   */
  _specialSelected(special) {
    const { m } = this.props;

    if (m.blueprint) { 
      if (special === null) {
        m.blueprint.special = null;
      } else {
        m.blueprint.special = Modifications.specials[special];
      }
    }

    const specialMenuOpened = false;
    this.setState({ specialMenuOpened, modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Provide a 'worst' roll within the information we have
   */
  _rollWorst() {
    const { m, ship } = this.props;
    const features = m.blueprint.features[m.blueprint.grade];
    for (const featureName in features) {
      if (Modifications.modifications[featureName].method == 'overwrite') {
        ship.setModification(m, featureName, features[featureName][1]);
      } else {
        let value = features[featureName][0];
        if (m.grp == 'sb' && featureName == 'shieldboost') {
          // Shield boosters are a special case.  Their boost is dependent on their base so we need to calculate the value here
          value = ((1 + m.shieldboost) * (1 + value) - 1) / m.shieldboost - 1;
        }

        if (Modifications.modifications[featureName].type == 'percentage') {
          ship.setModification(m, featureName, value * 10000);
        } else if (Modifications.modifications[featureName].type == 'numeric') {
          ship.setModification(m, featureName, value * 100);
        }
      }
    }

    this.setState({ modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Provide an 'average' roll within the information we have
   */
  _rollAverage() {
    const { m, ship } = this.props;
    const features = m.blueprint.features[m.blueprint.grade];
    for (const featureName in features) {
      if (Modifications.modifications[featureName].method == 'overwrite') {
        ship.setModification(m, featureName, (features[featureName][0] + features[featureName][1]) / 2);
      } else {
        let value = (features[featureName][0] + features[featureName][1]) / 2;
        if (m.grp == 'sb' && featureName == 'shieldboost') {
          // Shield boosters are a special case.  Their boost is dependent on their base so we need to calculate the value here
          value = ((1 + m.shieldboost) * (1 + value) - 1) / m.shieldboost - 1;
        }

        if (Modifications.modifications[featureName].type == 'percentage') {
          ship.setModification(m, featureName, value * 10000);
        } else if (Modifications.modifications[featureName].type == 'numeric') {
          ship.setModification(m, featureName, value * 100);
        }
      }
    }

    this.setState({ modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Provide a random roll within the information we have
   */
  _rollRandom() {
    const { m, ship } = this.props;
    const features = m.blueprint.features[m.blueprint.grade];
    for (const featureName in features) {
      if (Modifications.modifications[featureName].method == 'overwrite') {
        ship.setModification(m, featureName, features[featureName][1]);
      } else {
        let value = features[featureName][0] + (Math.random() * (features[featureName][1] - features[featureName][0]));
        if (m.grp == 'sb' && featureName == 'shieldboost') {
          // Shield boosters are a special case.  Their boost is dependent on their base so we need to calculate the value here
          value = ((1 + m.shieldboost) * (1 + value) - 1) / m.shieldboost - 1;
        }

        if (Modifications.modifications[featureName].type == 'percentage') {
          ship.setModification(m, featureName, value * 10000);
        } else if (Modifications.modifications[featureName].type == 'numeric') {
          ship.setModification(m, featureName, value * 100);
        }
      }
    }

    this.setState({ modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Provide a 'best' roll within the information we have
   */
  _rollBest() {
    const { m, ship } = this.props;
    const features = m.blueprint.features[m.blueprint.grade];
    for (const featureName in features) {
      if (Modifications.modifications[featureName].method == 'overwrite') {
        ship.setModification(m, featureName, features[featureName][1]);
      } else {
        let value = features[featureName][1];
        if (m.grp == 'sb' && featureName == 'shieldboost') {
          // Shield boosters are a special case.  Their boost is dependent on their base so we need to calculate the value here
          value = ((1 + m.shieldboost) * (1 + value) - 1) / m.shieldboost - 1;
        }

        if (Modifications.modifications[featureName].type == 'percentage') {
          ship.setModification(m, featureName, value * 10000);
        } else if (Modifications.modifications[featureName].type == 'numeric') {
          ship.setModification(m, featureName, value * 100);
        }
      }
    }

    this.setState({ modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Reset modification information
   */
  _reset() {
    const { m, ship } = this.props;
    ship.clearModifications(m);
    ship.clearBlueprint(m);

    this.setState({ modifications: this._setModifications(this.props) });
    this.props.onChange();
  }

  /**
   * Render the list
   * @return {React.Component} List
   */
  render() {
    const { language, tooltip, termtip } = this.context;
    const translate = language.translate;
    const { m } = this.props;
    const { blueprintMenuOpened, specialMenuOpened } = this.state;

    const _toggleBlueprintsMenu = this._toggleBlueprintsMenu;
    const _toggleSpecialsMenu = this._toggleSpecialsMenu;
    const _rollBest = this._rollBest;
    const _rollWorst = this._rollWorst;
    const _rollAverage = this._rollAverage;
    const _rollRandom = this._rollRandom;
    const _reset = this._reset;

    let blueprintLabel;
    let haveBlueprint = false;
    if (m.blueprint && !isEmpty(m.blueprint)) {
      blueprintLabel = translate(m.blueprint.name) + ' ' + translate('grade') + ' ' + m.blueprint.grade;
      haveBlueprint = true;
    } else {
      blueprintLabel = translate('PHRASE_SELECT_BLUEPRINT');
    }

    let specialLabel;
    let haveSpecial = false;
    if (m.blueprint && m.blueprint.special) {
      specialLabel = m.blueprint.special.name;
    } else {
      specialLabel = translate('PHRASE_SELECT_SPECIAL');
    }

    const showBlueprintsMenu = blueprintMenuOpened;
    const showSpecial = haveBlueprint && this.state.specials.length > 0;
    const showSpecialsMenu = specialMenuOpened;
    const showRolls = haveBlueprint && !blueprintMenuOpened && !specialMenuOpened;
    const showMods = !blueprintMenuOpened && !specialMenuOpened;

    return (
      <div
          className={cn('select', this.props.className)}
          onClick={(e) => e.stopPropagation() }
          onContextMenu={stopCtxPropagation}
      >
        <div className={ cn('section-menu', { selected: blueprintMenuOpened })} style={{ cursor: 'pointer' }} onClick={_toggleBlueprintsMenu}>{blueprintLabel}</div>
        { showBlueprintsMenu ? this.state.blueprints : '' }
        { showSpecial ? <div className={ cn('section-menu', { selected: specialMenuOpened })} style={{ cursor: 'pointer' }} onClick={_toggleSpecialsMenu}>{specialLabel}</div> : '' }
        { showSpecialsMenu ? this.state.specials : '' }
        { showRolls ?
            <table style={{ width: '100%', backgroundColor: 'transparent' }}>
              <tbody>
                <tr>
                  <td> { translate('roll') }: </td>
                  <td style={{ cursor: 'pointer' }} onClick={_rollWorst} onMouseOver={termtip.bind(null, 'PHRASE_BLUEPRINT_WORST')} onMouseOut={tooltip.bind(null, null)}> { translate('worst') } </td>
                  <td style={{ cursor: 'pointer' }} onClick={_rollAverage}onMouseOver={termtip.bind(null, 'PHRASE_BLUEPRINT_AVERAGE')} onMouseOut={tooltip.bind(null, null)}> { translate('average') } </td>
                  <td style={{ cursor: 'pointer' }} onClick={_rollBest}onMouseOver={termtip.bind(null, 'PHRASE_BLUEPRINT_BEST')} onMouseOut={tooltip.bind(null, null)}> { translate('best') } </td>
                  <td style={{ cursor: 'pointer' }} onClick={_rollRandom} onMouseOver={termtip.bind(null, 'PHRASE_BLUEPRINT_RANDOM')} onMouseOut={tooltip.bind(null, null)}> { translate('random') } </td>
                  <td style={{ cursor: 'pointer' }} onClick={_reset}onMouseOver={termtip.bind(null, 'PHRASE_BLUEPRINT_RESET')} onMouseOut={tooltip.bind(null, null)}> { translate('reset') } </td>
                </tr>
              </tbody>
          </table> : '' }
        { showMods ?
          <span onMouseOver={termtip.bind(null, 'HELP_MODIFICATIONS_MENU')} onMouseOut={tooltip.bind(null, null)} >
            { this.state.modifications }
          </span> : '' }
      </div>
    );
  }
}