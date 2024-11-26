import { useState, useEffect } from 'react';
import { Calculator, Clock } from 'lucide-react';

type CalculationType = 'financial-renting' | 'purchase';
type FuelType = 'benzine' | 'diesel' | 'electric';

interface FormValues {
  calculationType: CalculationType;
  title: string;
  // Car Details
  carModel: string;
  productionYear: number;
  fuelType: FuelType;
  powerKw: number;
  engineCapacity: string; // Format: 1.
  co2Emissions: number;
  // Financial Details
  totalAmount: number;
  months: number;
  remainingValuePercentage: number;
  hasLoan: boolean;
  interestRate: number;
  vatDeductible: boolean;
  registrationCost: number;  // New field
  yearlyTax: number;        // New field
}

interface CalculationResults {
  monthlyBase: number;
  monthlyWithVat: number;
  monthlyWithInterest: number;
  monthlyWithVatAndInterest: number;
  totalInterestPaid: number;
  totalWithVatAndInterest: number;
}

interface SavedCalculation {
  id: string;
  title: string;
  carDetails: string;
  date: string;
  values: FormValues;
  results: CalculationResults;
}

interface TaxBracket {
  minKW?: number;
  maxKW: number;
  rates: number[];
}

const VAT_RATE = 0.21;

const initialValues: FormValues = {
  calculationType: 'financial-renting',
  title: '',
  carModel: '',
  productionYear: new Date().getFullYear(),
  fuelType: 'benzine',
  powerKw: 0,
  engineCapacity: '',
  co2Emissions: 0,
  totalAmount: 0,
  months: 48,
  remainingValuePercentage: 35,
  hasLoan: false,
  interestRate: 5,
  vatDeductible: false,
  registrationCost: 0,     // Initialize new field
  yearlyTax: 0,           // Initialize new field
};

const initialResults: CalculationResults = {
  monthlyBase: 0,
  monthlyWithVat: 0,
  monthlyWithInterest: 0,
  monthlyWithVatAndInterest: 0,
  totalInterestPaid: 0,
  totalWithVatAndInterest: 0,
};

// Tax calculation table based on KW and age
const TAX_BRACKETS: TaxBracket[] = [
  { maxKW: 70, rates: Array(16).fill(61.50) },
  { 
    minKW: 71, 
    maxKW: 85, 
    rates: [123.00, 110.70, 98.40, 86.10, 73.80, 67.65, ...Array(10).fill(61.50)]
  },
  { 
    minKW: 86, 
    maxKW: 100, 
    rates: [495.00, 445.50, 396.00, 346.50, 297.00, 272.25, 247.50, 222.75, 198.00, 173.25, 148.50, 123.75, 99.00, 74.25, 61.50, 61.50]
  },
  { 
    minKW: 101, 
    maxKW: 110, 
    rates: [867.00, 780.30, 693.60, 606.90, 520.20, 476.85, 433.50, 390.15, 346.80, 303.45, 260.10, 216.75, 173.40, 130.05, 86.70, 61.50]
  },
  { 
    minKW: 111, 
    maxKW: 120, 
    rates: [1239.00, 1115.10, 991.20, 867.30, 743.40, 681.45, 619.50, 557.55, 495.60, 433.65, 371.70, 309.75, 247.80, 185.85, 123.90, 61.50]
  },
  { 
    minKW: 121, 
    maxKW: 155, 
    rates: [2478.00, 2230.20, 1982.40, 1734.60, 1486.80, 1362.90, 1239.00, 1115.10, 991.20, 867.30, 743.40, 619.50, 495.60, 371.70, 247.80, 61.50]
  },
  { 
    minKW: 156, 
    maxKW: Infinity, 
    rates: [4957.00, 4461.30, 3965.60, 3469.90, 2974.20, 2726.35, 2478.50, 2230.65, 1982.80, 1734.95, 1487.10, 1239.25, 991.40, 743.55, 495.70, 61.50]
  }
];

// CO2 tax brackets
const CO2_TAX_BRACKETS = [
  { min: 146, max: 155, amount: 100 },
  { min: 156, max: 165, amount: 175 },
  { min: 166, max: 175, amount: 250 },
  { min: 176, max: 185, amount: 375 },
  { min: 186, max: 195, amount: 500 },
  { min: 196, max: 205, amount: 600 },
  { min: 206, max: 215, amount: 700 },
  { min: 216, max: 225, amount: 1000 },
  { min: 226, max: 235, amount: 1200 },
  { min: 236, max: 245, amount: 1500 },
  { min: 246, max: 255, amount: 2000 },
  { min: 256, max: Infinity, amount: 2500 }
];

// Registration cost brackets based on engine capacity (CC)
const REGISTRATION_BRACKETS = [
  { maxCC: 750, cv: 4, cost: 100.98 },
  { minCC: 751, maxCC: 950, cv: 5, cost: 126.32 },
  { minCC: 951, maxCC: 1150, cv: 6, cost: 182.56 },
  { minCC: 1151, maxCC: 1350, cv: 7, cost: 238.52 },
  { minCC: 1351, maxCC: 1550, cv: 8, cost: 295.02 },
  { minCC: 1551, maxCC: 1750, cv: 9, cost: 351.52 },
  { minCC: 1751, maxCC: 1950, cv: 10, cost: 407.22 },
  { minCC: 1951, maxCC: 2150, cv: 11, cost: 528.40 },
  { minCC: 2151, maxCC: 2350, cv: 12, cost: 649.70 },
  { minCC: 2351, maxCC: 2550, cv: 13, cost: 770.62 },
  { minCC: 2551, maxCC: 2750, cv: 14, cost: 891.79 },
  { minCC: 2751, maxCC: 3050, cv: 15, cost: 1013.10 },
  { minCC: 3051, maxCC: 3250, cv: 16, cost: 1326.86 },
  { minCC: 3251, maxCC: 3450, cv: 17, cost: 1640.89 },
  { minCC: 3451, maxCC: 3650, cv: 18, cost: 1954.92 },
  { minCC: 3651, maxCC: 3950, cv: 19, cost: 2268.29 },
  { minCC: 3951, maxCC: 4150, cv: 20, cost: 2582.32 }
];

const calculateYearlyTax = (kw: number, productionYear: number): number => {
  // Find the appropriate tax bracket based on KW
  const bracket = TAX_BRACKETS.find(b => 
    (!b.minKW && kw <= b.maxKW) || 
    (b.maxKW === Infinity && kw >= (b.minKW ?? 0)) ||
    (b.minKW && kw >= b.minKW && kw <= b.maxKW)
  );

  if (!bracket) return 0;

  // Calculate vehicle age
  const currentYear = new Date().getFullYear();
  const age = currentYear - productionYear;
  
  // Get the appropriate rate based on age
  // If age is 15 or more years, use the last rate
  // If it's a new car (age <= 0), use the first rate
  const rateIndex = Math.min(Math.max(age, 0), 15);
  
  return bracket.rates[rateIndex];
};

const calculateCO2Tax = (co2Emissions: number): number => {
  // If CO2 emissions are below the minimum threshold, no additional tax
  if (co2Emissions < 146) return 0;
  
  // Find the appropriate CO2 tax bracket
  const bracket = CO2_TAX_BRACKETS.find(b => 
    co2Emissions >= b.min && co2Emissions <= b.max
  );
  
  return bracket ? bracket.amount : 0;
};

const calculateTotalYearlyTax = (kw: number, productionYear: number, co2Emissions: number, fuelType: string): number => {
  // Calculate base tax based on KW and age
  const baseTax = calculateYearlyTax(kw, productionYear);
  
  // Calculate additional CO2 tax if applicable (not for electric vehicles)
  const co2Tax = fuelType !== 'electric' ? calculateCO2Tax(co2Emissions) : 0;
  
  // Total tax is base tax plus any CO2 tax
  return baseTax + co2Tax;
};

const calculateRegistrationCost = (engineCapacity: number): number => {
  // Handle electric vehicles
  if (engineCapacity === 0) return 0;

  // Find the appropriate bracket based on engine capacity
  const bracket = REGISTRATION_BRACKETS.find(b => 
    (b.minCC === undefined && engineCapacity <= b.maxCC) || 
    (engineCapacity >= b.minCC! && engineCapacity <= b.maxCC)
  );

  // If found a bracket, return the cost
  if (bracket) return bracket.cost;

  // If engine capacity is higher than the last bracket (more than 20 CV)
  if (engineCapacity > 4150) {
    const baseAmount = 2582.32;
    // Estimate CV based on CC (rough approximation for values above 20 CV)
    const estimatedCV = Math.ceil((engineCapacity - 4150) / 200) + 20;
    const additionalCV = estimatedCV - 20;
    return baseAmount + (additionalCV * 140.84);
  }

  return 0;
};

const FinancialCalculator = () => {
  const [values, setValues] = useState<FormValues>(initialValues);
  const [results, setResults] = useState<CalculationResults>(initialResults);
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  const calculateValues = () => {
    if (!values.totalAmount || !values.months) return;

    let baseAmount = values.totalAmount;
    let monthlyBase;
    
    if (values.calculationType === 'financial-renting') {
      // For financial renting:
      // 1. First subtract VAT from total amount
      const amountWithoutVat = baseAmount / (1 + VAT_RATE);
      // 2. Calculate remaining value from amount without VAT
      const remainingValue = amountWithoutVat * (values.remainingValuePercentage / 100);
      // 3. Amount to finance is the amount without VAT minus remaining value
      const amountToFinance = amountWithoutVat - remainingValue;
      // 4. Calculate monthly base amount
      monthlyBase = amountToFinance / values.months;
    } else {
      // Purchase calculation
      if (values.vatDeductible) {
        // If VAT deductible, remove VAT from total amount
        baseAmount = values.totalAmount / (1 + VAT_RATE);
      }
      monthlyBase = baseAmount / values.months;
    }

    const monthlyWithVat = monthlyBase * (1 + VAT_RATE);

    let monthlyWithInterest = monthlyBase;
    let monthlyWithVatAndInterest = monthlyWithVat;
    let totalInterestPaid = 0;

    if (values.hasLoan && values.interestRate > 0) {
      const monthlyInterestRate = values.interestRate / 100 / 12;
      const numerator = monthlyInterestRate * Math.pow(1 + monthlyInterestRate, values.months);
      const denominator = Math.pow(1 + monthlyInterestRate, values.months) - 1;
      const loanFactor = numerator / denominator;
      
      monthlyWithInterest = monthlyBase * (1 + loanFactor);
      monthlyWithVatAndInterest = monthlyWithVat * (1 + loanFactor);
      totalInterestPaid = (monthlyWithVatAndInterest * values.months) - (monthlyWithVat * values.months);
    }

    setResults({
      monthlyBase,
      monthlyWithVat,
      monthlyWithInterest,
      monthlyWithVatAndInterest,
      totalInterestPaid,
      totalWithVatAndInterest: monthlyWithVatAndInterest * values.months
    });
  };

  const resetForm = () => {
    setValues(initialValues);
    setResults(initialResults);
  };

  useEffect(() => {
    calculateValues();
  }, [values]);

  useEffect(() => {
    // Load saved calculations from localStorage
    const saved = localStorage.getItem('savedCalculations');
    if (saved) {
      setSavedCalculations(JSON.parse(saved));
    }
  }, []);

  const handleSave = () => {
    if (!values.title || !values.carModel) {
      alert('Please enter a title and car model before saving');
      return;
    }

    const newCalculation: SavedCalculation = {
      id: Date.now().toString(),
      title: values.title,
      carDetails: `${values.carModel} (${values.productionYear})`,
      date: new Date().toLocaleDateString(),
      values: { ...values },
      results: { ...results }
    };

    const updatedCalculations = [...savedCalculations, newCalculation];
    setSavedCalculations(updatedCalculations);
    localStorage.setItem('savedCalculations', JSON.stringify(updatedCalculations));
    alert('Calculation saved successfully!');
    resetForm(); // Reset form after saving
  };

  const loadCalculation = (calc: SavedCalculation) => {
    setValues(calc.values);
    setResults(calc.results);
    setShowSaved(false);
  };

  const deleteCalculation = (id: string) => {
    const updatedCalculations = savedCalculations.filter(calc => calc.id !== id);
    setSavedCalculations(updatedCalculations);
    localStorage.setItem('savedCalculations', JSON.stringify(updatedCalculations));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <Calculator className="w-6 h-6" />
          <h1 className="text-2xl font-bold">Car Finance Calculator</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            <Clock className="w-4 h-4" />
            {showSaved ? 'Hide Saved' : 'View Saved'}
          </button>
        </div>
      </div>

      <div className="space-y-6 bg-white p-6 rounded-lg shadow">
        {showSaved ? (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Saved Calculations</h2>
            {savedCalculations.length === 0 ? (
              <p className="text-gray-500">No saved calculations yet.</p>
            ) : (
              savedCalculations.map((calc) => (
                <div key={calc.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium">{calc.title}</h3>
                      <p className="text-sm text-gray-600">{calc.carDetails}</p>
                      <p className="text-xs text-gray-500">Saved on: {calc.date}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadCalculation(calc)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteCalculation(calc.id)}
                        className="text-sm text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Amount: {formatCurrency(Number(calc.values.totalAmount))}</p>
                    <p>Monthly Payment: {formatCurrency(calc.results.monthlyWithVat)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex gap-4">
              <button
                onClick={() => setValues({ ...values, calculationType: 'financial-renting' })}
                className={`flex-1 py-2 px-4 rounded ${
                  values.calculationType === 'financial-renting'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Financial Renting
              </button>
              <button
                onClick={() => setValues({ ...values, calculationType: 'purchase' })}
                className={`flex-1 py-2 px-4 rounded ${
                  values.calculationType === 'purchase'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Purchase
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">Title</label>
              <input
                type="text"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., BMW 320i Lease Calculation"
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Vehicle Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Car Model</label>
                  <input
                    type="text"
                    value={values.carModel}
                    onChange={(e) => setValues({ ...values, carModel: e.target.value })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., BMW 320i"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Production Year</label>
                  <input
                    type="number"
                    value={values.productionYear.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || new Date().getFullYear();
                      const kw = parseInt(values.powerKw) || 0;
                      const co2 = parseInt(values.co2Emissions) || 0;
                      setValues({ 
                        ...values, 
                        productionYear: value,
                        yearlyTax: calculateTotalYearlyTax(kw, value, co2, values.fuelType)
                      });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="1900"
                    max={new Date().getFullYear() + 1}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Fuel Type</label>
                  <select
                    value={values.fuelType}
                    onChange={(e) => setValues({ ...values, fuelType: e.target.value as FuelType })}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="benzine">Benzine</option>
                    <option value="diesel">Diesel</option>
                    <option value="electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Power (kW)</label>
                  <input
                    type="number"
                    value={values.powerKw.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      const prodYear = parseInt(values.productionYear) || new Date().getFullYear();
                      const co2 = parseInt(values.co2Emissions) || 0;
                      setValues({ 
                        ...values, 
                        powerKw: value,
                        yearlyTax: calculateTotalYearlyTax(value, prodYear, co2, values.fuelType)
                      });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    min="0"
                    placeholder="e.g., 140"
                  />
                </div>

                {values.fuelType !== 'electric' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Engine Capacity (CC)
                        <span className="text-xs text-gray-500 ml-1">e.g., 1234</span>
                      </label>
                      <input
                        type="text"
                        value={values.engineCapacity}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow whole numbers
                          if (/^\d*$/.test(value)) {
                            const cc = parseInt(value) || 0;
                            setValues({ 
                              ...values, 
                              engineCapacity: value,
                              registrationCost: calculateRegistrationCost(cc)
                            });
                          }
                        }}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        placeholder="e.g., 1998"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">CO₂ Emissions (g/km)</label>
                      <input
                        type="number"
                        value={values.co2Emissions.toString()}
                        onChange={(e) => {
                          const value = parseInt(e.target.value) || 0;
                          const kw = parseInt(values.powerKw) || 0;
                          const prodYear = parseInt(values.productionYear) || new Date().getFullYear();
                          setValues({ 
                            ...values, 
                            co2Emissions: value,
                            yearlyTax: calculateTotalYearlyTax(kw, prodYear, value, values.fuelType)
                          });
                        }}
                        className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        min="0"
                        placeholder="e.g., 95"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Vehicle Registration and Tax Section */}
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Registration & Tax Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Registration Cost (€)
                    <span className="text-xs text-gray-500 ml-1">One-time cost</span>
                  </label>
                  <input
                    type="text"
                    value={values.registrationCost.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setValues({ ...values, registrationCost: value });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., 1500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Yearly Tax (€)
                    <span className="text-xs text-gray-500 ml-1">Annual cost</span>
                  </label>
                  <input
                    type="text"
                    value={values.yearlyTax.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setValues({ ...values, yearlyTax: value });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="e.g., 500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">Financial Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount (€)</label>
                  <input
                    type="number"
                    value={values.totalAmount.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setValues({ ...values, totalAmount: value });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Number of Months</label>
                  <input
                    type="number"
                    value={values.months.toString()}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 0;
                      setValues({ ...values, months: value });
                    }}
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              {values.calculationType === 'financial-renting' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Remaining Value (%)</label>
                  <input
                    type="number"
                    value={values.remainingValuePercentage.toString()}
                    onChange={(e) =>
                      setValues({ ...values, remainingValuePercentage: parseInt(e.target.value) || 0 })
                    }
                    className="mt-1 block w-full rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              )}

              {values.calculationType === 'purchase' && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={values.vatDeductible}
                    onChange={(e) => setValues({ ...values, vatDeductible: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label className="ml-2 block text-sm font-medium text-gray-700">
                    VAT Deductible
                  </label>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={resetForm}
                className="flex items-center gap-1 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reset
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Clock className="w-4 h-4" />
                Save Calculation
              </button>
            </div>

            <div className="mt-6 space-y-6 bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Results</h3>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                    <span className="text-sm font-medium text-gray-700">Monthly Payment:</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(results.monthlyBase)}</span>
                  </div>
                  
                  {values.calculationType === 'financial-renting' && (
                    <>
                      <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Monthly with VAT:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(results.monthlyWithVat)}</span>
                      </div>
                    </>
                  )}

                  {values.hasLoan && (
                    <>
                      <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Monthly with Interest:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(results.monthlyWithVatAndInterest)}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Total Interest:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(results.totalInterestPaid)}</span>
                      </div>
                    </>
                  )}

                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-sm font-medium text-gray-700 mb-3">Total Cost of Ownership Breakdown:</div>
                    
                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Vehicle Cost:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(results.totalWithVatAndInterest)}</span>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Registration Cost:</span>
                      <div className="text-right">
                        <span className="font-medium text-gray-900">{formatCurrency(values.registrationCost)}</span>
                        {parseInt(values.engineCapacity) > 4150 && (
                          <div className="text-xs text-gray-500">
                            Includes additional CV charge
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Total Tax Over Period:</span>
                      <span className="font-medium text-gray-900">{formatCurrency(values.yearlyTax * Math.ceil(values.months / 12))}</span>
                    </div>

                    <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">Base Yearly Tax (KW & Age):</span>
                      <span className="font-medium text-gray-900">{formatCurrency(calculateYearlyTax(parseInt(values.powerKw) || 0, parseInt(values.productionYear) || new Date().getFullYear()))}</span>
                    </div>

                    {values.fuelType !== 'electric' && parseInt(values.co2Emissions) >= 146 && (
                      <div className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                        <span className="text-sm text-gray-600">Additional CO₂ Tax:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(calculateCO2Tax(parseInt(values.co2Emissions) || 0))}</span>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex justify-between items-center p-2 bg-blue-50 rounded-lg">
                        <span className="text-sm font-semibold text-blue-900">Total Cost of Ownership:</span>
                        <span className="font-bold text-blue-900">
                          {formatCurrency(
                            results.totalWithVatAndInterest + 
                            values.registrationCost + 
                            (values.yearlyTax * Math.ceil(values.months / 12))
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
};

export default FinancialCalculator;
