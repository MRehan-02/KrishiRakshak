/**
 * KrishiRakshak Weather Risk Calculation Rules
 * Based on temperature, humidity, and rainfall:
 * - humidity > 80% or rain > 2mm: HIGH fungal risk
 * - humidity 65% - 80%: MEDIUM fungal risk
 * - temp > 35°C and humidity < 40%: MEDIUM mite/aphid risk
 * - else: LOW
 */

export function calculateDayRisk(avgHumidity, totalRain, maxTemp) {
  if (avgHumidity > 80 || totalRain > 2) {
    return {
      level: 'high',
      type: 'fungal',
      actionKey: 'risk_action_fungal_high',
      descriptionKey: 'risk_desc_fungal_high',
    };
  }

  if (avgHumidity >= 65 && avgHumidity <= 80) {
    return {
      level: 'medium',
      type: 'fungal',
      actionKey: 'risk_action_fungal_medium',
      descriptionKey: 'risk_desc_fungal_medium',
    };
  }

  if (maxTemp > 35 && avgHumidity < 40) {
    return {
      level: 'medium',
      type: 'pest',
      actionKey: 'risk_action_pest_medium',
      descriptionKey: 'risk_desc_pest_medium',
    };
  }

  return {
    level: 'low',
    type: 'favorable',
    actionKey: 'risk_action_low',
    descriptionKey: 'risk_desc_low',
  };
}
