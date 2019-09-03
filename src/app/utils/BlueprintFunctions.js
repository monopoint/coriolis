import React from 'react';
import { Modifications } from 'coriolis-data/dist';
import { STATS_FORMATTING } from '../shipyard/StatsFormatting';

/**
 * Generate a tooltip with details of a blueprint's specials
 * @param   {Object}  translate   The translate object
 * @param   {Object}  blueprint   The blueprint at the required grade
 * @param   {string}  grp         The group of the module
 * @param   {Object}  m           The module to compare with
 * @param   {string} specialName  The name of the special
 * @returns {Object}              The react components
 */
export function specialToolTip(translate, blueprint, grp, m, specialName) {
  const effects = [];
  if (!blueprint || !blueprint.features) {
    return undefined;
  }
  if (m) {
    // We also add in any benefits from specials that aren't covered above
    if (m.blueprint) {
      for (const feature in Modifications.modifierActions[specialName]) {
        // if (!blueprint.features[feature] && !m.mods.feature) {
        const featureDef = Modifications.modifications[feature];
        if (featureDef && !featureDef.hidden) {
          let symbol = '';
          if (feature === 'jitter') {
            symbol = '°';
          } else if (featureDef.type === 'percentage') {
            symbol = '%';
          }
          let current = m.getModValue(feature) - m.getModValue(feature, true);
          if (featureDef.type === 'percentage') {
            current = Math.round(current / 10) / 10;
          } else if (featureDef.type === 'numeric') {
            current /= 100;
          }
          const currentIsBeneficial = isValueBeneficial(feature, current);

          effects.push(
            <tr key={feature + '_specialTT'}>
              <td style={{ textAlign: 'left' }}>{translate(feature, grp)}</td>
              <td>&nbsp;</td>
              <td className={current === 0 ? '' : currentIsBeneficial ? 'secondary' : 'warning'}
                style={{ textAlign: 'right' }}>{current}{symbol}</td>
              <td>&nbsp;</td>
            </tr>
          );
        }
      }
    }
  }

  return (
    <div>
      <table width='100%'>
        <tbody>
          {effects}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Generate a tooltip with details of a blueprint's effects
 * @param   {Object}  translate   The translate object
 * @param   {Object}  blueprint   The blueprint at the required grade
 * @param   {Array}   engineers   The engineers supplying this blueprint
 * @param   {string}  grp         The group of the module
 * @param   {Object}  m           The module to compare with
 * @returns {Object}              The react components
 */
export function blueprintTooltip(translate, blueprint, engineers, grp, m) {
  const effects = [];
  if (!blueprint || !blueprint.features) {
    return undefined;
  }
  for (const feature in blueprint.features) {
    const featureIsBeneficial = isBeneficial(feature, blueprint.features[feature]);
    const featureDef = Modifications.modifications[feature];
    if (!featureDef.hidden) {
      let symbol = '';
      if (feature === 'jitter') {
        symbol = '°';
      } else if (featureDef.type === 'percentage') {
        symbol = '%';
      }
      let lowerBound = blueprint.features[feature][0];
      let upperBound = blueprint.features[feature][1];
      if (featureDef.type === 'percentage') {
        lowerBound = Math.round(lowerBound * 1000) / 10;
        upperBound = Math.round(upperBound * 1000) / 10;
      }
      const lowerIsBeneficial  = isValueBeneficial(feature, lowerBound);
      const upperIsBeneficial  = isValueBeneficial(feature, upperBound);
      if (m) {
        // We have a module - add in the current value
        let current = m.getModValue(feature);
        if (featureDef.type === 'percentage' || featureDef.name === 'burst' || featureDef.name === 'burstrof') {
          current = Math.round(current / 10) / 10;
        } else if (featureDef.type === 'numeric') {
          current /= 100;
        }
        const currentIsBeneficial  = isValueBeneficial(feature, current);
        effects.push(
          <tr key={feature}>
            <td style={{ textAlign: 'left' }}>{translate(feature, grp)}</td>
            <td className={lowerBound === 0 ? '' : lowerIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{lowerBound}{symbol}</td>
            <td className={current === 0 ? '' : currentIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{current}{symbol}</td>
            <td className={upperBound === 0 ? '' : upperIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{upperBound}{symbol}</td>
          </tr>
        );
      } else {
        // We do not have a module, no value
        effects.push(
          <tr key={feature}>
            <td style={{ textAlign: 'left' }}>{translate(feature, grp)}</td>
            <td className={lowerBound === 0 ? '' : lowerIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{lowerBound}{symbol}</td>
            <td className={upperBound === 0 ? '' : upperIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{upperBound}{symbol}</td>
          </tr>
        );
      }
    }
  }
  if (m) {
    // Because we have a module add in any benefits that aren't part of the primary blueprint
    for (const feature in m.mods) {
      if (!blueprint.features[feature]) {
        const featureDef = Modifications.modifications[feature];
        if (featureDef && !featureDef.hidden) {
          let symbol = '';
          if (feature === 'jitter') {
            symbol = '°';
          } else if (featureDef.type === 'percentage') {
            symbol = '%';
          }
          let current = m.getModValue(feature);
          if (featureDef.type === 'percentage' || featureDef.name === 'burst' || featureDef.name === 'burstrof') {
            current = Math.round(current / 10) / 10;
          } else if (featureDef.type === 'numeric') {
            current /= 100;
          }
          const currentIsBeneficial  = isValueBeneficial(feature, current);
          effects.push(
            <tr key={feature}>
              <td style={{ textAlign: 'left' }}>{translate(feature, grp)}</td>
              <td>&nbsp;</td>
              <td className={current === 0 ? '' : currentIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{current}{symbol}</td>
              <td>&nbsp;</td>
            </tr>
          );
        }
      }
    }

    // We also add in any benefits from specials that aren't covered above
    if (m.blueprint && m.blueprint.special) {
      for (const feature in Modifications.modifierActions[m.blueprint.special.edname]) {
        if (!blueprint.features[feature] && !m.mods.feature) {
          const featureDef = Modifications.modifications[feature];
          if (featureDef && !featureDef.hidden) {
            let symbol = '';
            if (feature === 'jitter') {
              symbol = '°';
            } else if (featureDef.type === 'percentage') {
              symbol = '%';
            }
            let current = m.getModValue(feature);
            if (featureDef.type === 'percentage' || featureDef.name === 'burst' || featureDef.name === 'burstrof') {
              current = Math.round(current / 10) / 10;
            } else if (featureDef.type === 'numeric') {
              current /= 100;
            }
            const currentIsBeneficial  = isValueBeneficial(feature, current);
            effects.push(
              <tr key={feature}>
                <td style={{ textAlign: 'left' }}>{translate(feature, grp)}</td>
                <td>&nbsp;</td>
                <td className={current === 0 ? '' : currentIsBeneficial ? 'secondary' : 'warning'} style={{ textAlign: 'right' }}>{current}{symbol}</td>
                <td>&nbsp;</td>
              </tr>
            );
          }
        }
      }
    }
  }

  let components;
  if (!m) {
    components = [];
    for (const component in blueprint.components) {
      components.push(
        <tr key={component}>
          <td style={{ textAlign: 'left' }}>{translate(component)}</td>
          <td style={{ textAlign: 'right' }}>{blueprint.components[component]}</td>
        </tr>
      );
    }
  }

  let engineersList;
  if (engineers) {
    engineersList = [];
    for (const engineer of engineers) {
      engineersList.push(
        <tr key={engineer}>
          <td style={{ textAlign: 'left' }}>{engineer}</td>
        </tr>
      );
    }
  }

  return (
    <div>
      <table width='100%'>
        <thead>
          <tr>
            <td>{translate('feature')}</td>
            <td>{translate('worst')}</td>
            {m ? <td>{translate('current')}</td> : null }
            <td>{translate('best')}</td>
          </tr>
        </thead>
        <tbody>
          {effects}
        </tbody>
      </table>
      { components ?  <table width='100%'>
        <thead>
          <tr>
            <td>{translate('component')}</td>
            <td>{translate('amount')}</td>
          </tr>
        </thead>
        <tbody>
          {components}
        </tbody>
      </table> : null }
      { engineersList ? <table width='100%'>
        <thead>
          <tr>
            <td>{translate('engineers')}</td>
          </tr>
        </thead>
        <tbody>
          {engineersList}
        </tbody>
      </table>  : null }
    </div>
  );
}

/**
 * Is this blueprint feature beneficial?
 * @param   {string}  feature    The name of the feature
 * @param   {array}   values     The value of the feature
 * @returns {boolean}            True if this feature is beneficial
 */
export function isBeneficial(feature, values) {
  const fact = (values[0] < 0 || (values[0] === 0 && values[1] < 0));
  if (Modifications.modifications[feature].higherbetter) {
    return !fact;
  } else {
    return fact;
  }
}

/**
 * Is this feature value beneficial?
 * @param   {string}  feature    The name of the feature
 * @param   {number}  value      The value of the feature
 * @returns {boolean}            True if this value is beneficial
 */
export function isValueBeneficial(feature, value) {
  if (Modifications.modifications[feature].higherbetter) {
    return value > 0;
  } else {
    return value < 0;
  }
}

/**
 * Is the change as shown beneficial?
 * @param {string} feature The name of the feature
 * @param {number} value The value of the feature as percentage change
 * @returns True if the value is beneficial
 */
export function isChangeValueBeneficial(feature, value) {
  let changeHigherBetter = STATS_FORMATTING[feature].higherbetter;
  if (changeHigherBetter === undefined) {
    return isValueBeneficial(feature, value);
  }

  if (changeHigherBetter) {
    return value > 0;
  } else {
    return value < 0;
  }
}

/**
 * Get a blueprint with a given name and an optional module
 * @param   {string} name    The name of the blueprint
 * @param   {Object} module  The module for which to obtain this blueprint
 * @returns {Object}         The matching blueprint
 */
export function getBlueprint(name, module) {
  // Start with a copy of the blueprint
  const findMod = val => Object.keys(Modifications.blueprints).find(elem => elem.toString().toLowerCase().search(val.toString().toLowerCase().replace(/(OutfittingFieldType_|persecond)/igm, '')) >= 0);
  const found = Modifications.blueprints[findMod(name)];
  if (!found || !found.fdname) {
    return {};
  }
  const blueprint = JSON.parse(JSON.stringify(found));
  return blueprint;
}

/**
 * Provide 'percent' primary modifications
 * @param {Object}      ship      The ship for which to perform the modifications
 * @param {Object}      m         The module for which to perform the modifications
 * @param {Number} percent The percent to set values to of full.
 */
export function setPercent(ship, m, percent) {
  ship.clearModifications(m);
  // Pick given value as multiplier
  const mult = percent / 100;
  const features = m.blueprint.grades[m.blueprint.grade].features;
  for (const featureName in features) {
    let value;
    if (Modifications.modifications[featureName].higherbetter) {
      // Higher is better, but is this making it better or worse?
      if (features[featureName][0] < 0 || (features[featureName][0] === 0 && features[featureName][1] < 0)) {
        value = features[featureName][1] + ((features[featureName][0] - features[featureName][1]) * mult);
      } else {
        value = features[featureName][0] + ((features[featureName][1] - features[featureName][0]) * mult);
      }
    } else {
      // Higher is worse, but is this making it better or worse?
      if (features[featureName][0] < 0 || (features[featureName][0] === 0 && features[featureName][1] < 0)) {
        value = features[featureName][0] + ((features[featureName][1] - features[featureName][0]) * mult);
      } else {
        value = features[featureName][1] + ((features[featureName][0] - features[featureName][1]) * mult);
      }
    }

    _setValue(ship, m, featureName, value);
  }
}

/**
 * Provide 'random' primary modifications
 * @param {Object}      ship      The ship for which to perform the modifications
 * @param {Object}      m         The module for which to perform the modifications
 */
export function setRandom(ship, m) {
  // Pick a single value for our randomness
  setPercent(ship, m, Math.random() * 100);
}

/**
 * Set a modification feature value
 * @param {Object}      ship          The ship for which to perform the modifications
 * @param {Object}      m             The module for which to perform the modifications
 * @param {string}      featureName   The feature being set
 * @param {number}      value         The value being set for the feature
 */
function _setValue(ship, m, featureName, value) {
  if (Modifications.modifications[featureName].type == 'percentage') {
    ship.setModification(m, featureName, value * 10000);
  } else if (Modifications.modifications[featureName].type == 'numeric') {
    ship.setModification(m, featureName, value * 100);
  } else {
    ship.setModification(m, featureName, value);
  }
}

/**
 * Provide 'percent' primary query
 * @param {Object}      m         The module for which to perform the query
 * @returns {Number} percent The percentage indicator of current applied values.
 */
export function getPercent(m) {
  let result = null;
  const features = m.blueprint.grades[m.blueprint.grade].features;
  for (const featureName in features) {
    if (features[featureName][0] === features[featureName][1]) {
      continue;
    }

    let value = _getValue(m, featureName);
    let mult;
    if (Modifications.modifications[featureName].higherbetter) {
      // Higher is better, but is this making it better or worse?
      if (features[featureName][0] < 0 || (features[featureName][0] === 0 && features[featureName][1] < 0)) {
        mult = Math.round((value - features[featureName][1]) / (features[featureName][0] - features[featureName][1]) * 100);
      } else {
        mult = Math.round((value - features[featureName][0]) / (features[featureName][1] - features[featureName][0]) * 100);
      }
    } else {
      // Higher is worse, but is this making it better or worse?
      if (features[featureName][0] < 0 || (features[featureName][0] === 0 && features[featureName][1] < 0)) {
        mult = Math.round((value - features[featureName][0]) / (features[featureName][1] - features[featureName][0]) * 100);
      } else {
        mult = Math.round((value - features[featureName][1]) / (features[featureName][0] - features[featureName][1]) * 100);
      }
    }

    if (result && result != mult) {
      return null;
    } else if (result != mult) {
      result = mult;
    }
  }

  return result;
}

/**
 * Query a feature value
 * @param {Object}      m             The module for which to perform the query
 * @param {string}      featureName   The feature being queried
 * @returns {number}  The value of the modification as a %
 */
function _getValue(m, featureName) {
  if (Modifications.modifications[featureName].type == 'percentage') {
    return m.getModValue(featureName, true) / 10000;
  } else if (Modifications.modifications[featureName].type == 'numeric') {
    return m.getModValue(featureName, true) / 100;
  } else {
    return m.getModValue(featureName, true);
  }
}
