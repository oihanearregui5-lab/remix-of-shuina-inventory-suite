export interface ExcelVacationCell {
  day: number | null;
  worker: string | null;
}

export interface ExcelVacationMonth {
  month: string;
  weeks: ExcelVacationCell[][];
}

export interface ExcelGenericEntry {
  weekday: string | null;
  day: number | null;
  hours: number | null;
}

export interface ExcelGenericMonth {
  month: string;
  entries: ExcelGenericEntry[];
}

export interface ExcelWorkerMonthSummary {
  month: string;
  hours: number;
  workedDays: number;
  sampleDays: number[];
}

export interface ExcelWorkerSheet {
  sheet: string;
  title: string;
  months: ExcelWorkerMonthSummary[];
}

export const excelVacationMonths: ExcelVacationMonth[] = [
  {
    "month": "Enero",
    "weeks": [
      [
        {
          "day": 1,
          "worker": "SILVIO"
        },
        {
          "day": 2,
          "worker": "SILVIO SIL"
        },
        {
          "day": 3,
          "worker": "HAMID"
        },
        {
          "day": 4,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 5,
          "worker": "ANDRIY S"
        },
        {
          "day": 6,
          "worker": "ANDRIY S"
        },
        {
          "day": 7,
          "worker": "ANDRIY S"
        },
        {
          "day": 8,
          "worker": "ANDRIY S"
        },
        {
          "day": 9,
          "worker": "ANDRIY S"
        },
        {
          "day": 10,
          "worker": "HAMID"
        },
        {
          "day": 11,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 12,
          "worker": "FRAN S"
        },
        {
          "day": 13,
          "worker": "FRAN S"
        },
        {
          "day": 14,
          "worker": "FRAN S"
        },
        {
          "day": 15,
          "worker": "FRAN S"
        },
        {
          "day": 16,
          "worker": "FRAN S"
        },
        {
          "day": 17,
          "worker": "HAMID"
        },
        {
          "day": 18,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 19,
          "worker": "ANDRIY S"
        },
        {
          "day": 20,
          "worker": "ANDRIY S"
        },
        {
          "day": 21,
          "worker": "ANDRIY S"
        },
        {
          "day": 22,
          "worker": "ANDRIY S"
        },
        {
          "day": 23,
          "worker": "ANDRIY S"
        },
        {
          "day": 24,
          "worker": "HAMID"
        },
        {
          "day": 25,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 26,
          "worker": "FRAN S"
        },
        {
          "day": 27,
          "worker": "FRAN SM"
        },
        {
          "day": 28,
          "worker": "FRAN SM"
        },
        {
          "day": 29,
          "worker": "FRAN SM"
        },
        {
          "day": 30,
          "worker": "FRAN SM"
        },
        {
          "day": 31,
          "worker": "HAMID"
        },
        {
          "day": 1,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ]
    ]
  },
  {
    "month": "Febrero",
    "weeks": [
      [
        {
          "day": 2,
          "worker": "ANDRIY MS"
        },
        {
          "day": 3,
          "worker": "ANDRIY MS"
        },
        {
          "day": 4,
          "worker": "ANDRIY MS"
        },
        {
          "day": 5,
          "worker": "ANDRIY MS"
        },
        {
          "day": 6,
          "worker": "ANDRIY MS"
        },
        {
          "day": 7,
          "worker": "HAMID"
        },
        {
          "day": 8,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 9,
          "worker": "FRAN SM"
        },
        {
          "day": 10,
          "worker": "FRAN SM"
        },
        {
          "day": 11,
          "worker": "FRAN SM"
        },
        {
          "day": 12,
          "worker": "FRAN SM"
        },
        {
          "day": 13,
          "worker": "FRAN SM"
        },
        {
          "day": 14,
          "worker": "HAMID"
        },
        {
          "day": 15,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYYBEN"
        }
      ],
      [
        {
          "day": 16,
          "worker": "ANDRIY MS"
        },
        {
          "day": 17,
          "worker": "ANDRIY MS"
        },
        {
          "day": 18,
          "worker": "ANDRIY MS"
        },
        {
          "day": 19,
          "worker": "ANDRIY MS"
        },
        {
          "day": 20,
          "worker": "ANDRIY MS"
        },
        {
          "day": 21,
          "worker": "HAMID"
        },
        {
          "day": 22,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 23,
          "worker": "FRAN SM"
        },
        {
          "day": 24,
          "worker": "FRAN SM"
        },
        {
          "day": 25,
          "worker": "FRAN SM"
        },
        {
          "day": 26,
          "worker": "FRAN SM"
        },
        {
          "day": 27,
          "worker": "FRAN SM"
        },
        {
          "day": 28,
          "worker": "HAMID"
        },
        {
          "day": 1,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Marzo",
    "weeks": [
      [
        {
          "day": 2,
          "worker": "ANDRIY MS"
        },
        {
          "day": 3,
          "worker": "ANDRIY MS"
        },
        {
          "day": 4,
          "worker": "ANDRIY MS"
        },
        {
          "day": 5,
          "worker": "ANDRIY MS"
        },
        {
          "day": 6,
          "worker": "ANDRIY MS"
        },
        {
          "day": 7,
          "worker": "HAMID"
        },
        {
          "day": 8,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 9,
          "worker": "FRAN SM"
        },
        {
          "day": 10,
          "worker": "FRAN SM"
        },
        {
          "day": 11,
          "worker": "FRAN SM"
        },
        {
          "day": 12,
          "worker": "FRAN SM"
        },
        {
          "day": 13,
          "worker": "SILVIO M"
        },
        {
          "day": 14,
          "worker": "HAMID"
        },
        {
          "day": 15,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 16,
          "worker": "ANDRIY MS"
        },
        {
          "day": 17,
          "worker": "ANDRIY MS"
        },
        {
          "day": 18,
          "worker": "ANDRIY MS"
        },
        {
          "day": 19,
          "worker": "ANDRIY MS"
        },
        {
          "day": 20,
          "worker": "ANDRIY MS"
        },
        {
          "day": 21,
          "worker": "SILVIO"
        },
        {
          "day": 22,
          "worker": "SILVIO"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 23,
          "worker": "FRAN SM"
        },
        {
          "day": 24,
          "worker": "FRAN SM"
        },
        {
          "day": 25,
          "worker": "FRAN SM"
        },
        {
          "day": 26,
          "worker": "FRAN SM"
        },
        {
          "day": 27,
          "worker": "FRAN SM"
        },
        {
          "day": 28,
          "worker": null
        },
        {
          "day": 29,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 30,
          "worker": "ANDRIY MS"
        },
        {
          "day": 31,
          "worker": "ANDRIY MS"
        },
        {
          "day": 1,
          "worker": "ANDRIY MS"
        },
        {
          "day": 2,
          "worker": "SILVESTRE"
        },
        {
          "day": 3,
          "worker": "SILVIO"
        },
        {
          "day": 4,
          "worker": "MANUEL"
        },
        {
          "day": 5,
          "worker": "MANUEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "ANDRIY/SILVIO"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ]
    ]
  },
  {
    "month": "Abril",
    "weeks": [
      [
        {
          "day": 6,
          "worker": "SILVIO"
        },
        {
          "day": 7,
          "worker": "SILVESTRE"
        },
        {
          "day": 8,
          "worker": "SILVESTRE"
        },
        {
          "day": 9,
          "worker": null
        },
        {
          "day": 10,
          "worker": null
        },
        {
          "day": 11,
          "worker": "HAMID"
        },
        {
          "day": 12,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 13,
          "worker": "MISAEL"
        },
        {
          "day": 14,
          "worker": "SILVESTRE"
        },
        {
          "day": 15,
          "worker": "ANDRIY MS"
        },
        {
          "day": 16,
          "worker": "ANDRIY MS"
        },
        {
          "day": 17,
          "worker": "ANDRIY MS"
        },
        {
          "day": 18,
          "worker": "HAMID"
        },
        {
          "day": 19,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 20,
          "worker": "FRAN SM"
        },
        {
          "day": 21,
          "worker": "FRAN SM"
        },
        {
          "day": 22,
          "worker": "FRAN SM"
        },
        {
          "day": 23,
          "worker": "FRAN SM"
        },
        {
          "day": 24,
          "worker": "FRAN SM"
        },
        {
          "day": 25,
          "worker": "HAMID"
        },
        {
          "day": 26,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 27,
          "worker": "ANDRIY MS"
        },
        {
          "day": 28,
          "worker": "ANDRIY MS"
        },
        {
          "day": 29,
          "worker": "ANDRIY MS"
        },
        {
          "day": 30,
          "worker": "ANDRIY MS"
        },
        {
          "day": 1,
          "worker": "ANDRIY MS"
        },
        {
          "day": 2,
          "worker": "HAMID"
        },
        {
          "day": 3,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ]
    ]
  },
  {
    "month": "Mayo",
    "weeks": [
      [
        {
          "day": 4,
          "worker": "FRAN SM"
        },
        {
          "day": 5,
          "worker": "FRAN SM"
        },
        {
          "day": 6,
          "worker": "FRAN SM"
        },
        {
          "day": 7,
          "worker": "FRAN SM"
        },
        {
          "day": 8,
          "worker": "FRAN SM"
        },
        {
          "day": 9,
          "worker": "HAMID"
        },
        {
          "day": 10,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 11,
          "worker": "ANDRIY MS"
        },
        {
          "day": 12,
          "worker": "ANDRIY MS"
        },
        {
          "day": 13,
          "worker": "ANDRIY MS"
        },
        {
          "day": 14,
          "worker": "ANDRIY MS"
        },
        {
          "day": 15,
          "worker": "ANDRIY MS"
        },
        {
          "day": 16,
          "worker": "HAMID"
        },
        {
          "day": 17,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 18,
          "worker": "FRAN SM"
        },
        {
          "day": 19,
          "worker": "FRAN SM"
        },
        {
          "day": 20,
          "worker": "FRAN SM"
        },
        {
          "day": 21,
          "worker": "FRAN SM"
        },
        {
          "day": 22,
          "worker": "FRAN SM"
        },
        {
          "day": 23,
          "worker": "HAMID"
        },
        {
          "day": 24,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 25,
          "worker": "ANDRIY MS"
        },
        {
          "day": 26,
          "worker": "ANDRIY MS"
        },
        {
          "day": 27,
          "worker": "ANDRIY MS"
        },
        {
          "day": 28,
          "worker": "ANDRIY MS"
        },
        {
          "day": 29,
          "worker": "ANDRIY MS"
        },
        {
          "day": 30,
          "worker": "HAMID"
        },
        {
          "day": 31,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Junio",
    "weeks": [
      [
        {
          "day": 1,
          "worker": "FRAN SM"
        },
        {
          "day": 2,
          "worker": "FRAN SM"
        },
        {
          "day": 3,
          "worker": "FRAN SM"
        },
        {
          "day": 4,
          "worker": "FRAN SM"
        },
        {
          "day": 5,
          "worker": "FRAN SM"
        },
        {
          "day": 6,
          "worker": "HAMID"
        },
        {
          "day": 7,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 8,
          "worker": "ANDRIY MS"
        },
        {
          "day": 9,
          "worker": "ANDRIY MS"
        },
        {
          "day": 10,
          "worker": "ANDRIY MS"
        },
        {
          "day": 11,
          "worker": "ANDRIY MS"
        },
        {
          "day": 12,
          "worker": "ANDRIY MS"
        },
        {
          "day": 13,
          "worker": "HAMID"
        },
        {
          "day": 14,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 15,
          "worker": "FRAN SM"
        },
        {
          "day": 16,
          "worker": "FRAN SM"
        },
        {
          "day": 17,
          "worker": "FRAN SM"
        },
        {
          "day": 18,
          "worker": "FRAN SM"
        },
        {
          "day": 19,
          "worker": "FRAN SM"
        },
        {
          "day": 20,
          "worker": "HAMID"
        },
        {
          "day": 21,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 22,
          "worker": "ANDRIY M"
        },
        {
          "day": 23,
          "worker": "ANDRIY M"
        },
        {
          "day": 24,
          "worker": "ANDRIY M"
        },
        {
          "day": 25,
          "worker": "ANDRIY M"
        },
        {
          "day": 26,
          "worker": "ANDRIY M"
        },
        {
          "day": 27,
          "worker": "HAMID"
        },
        {
          "day": 28,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 29,
          "worker": "FRAN M"
        },
        {
          "day": 30,
          "worker": "FRAN M"
        },
        {
          "day": 1,
          "worker": "FRAN M"
        },
        {
          "day": 2,
          "worker": "FRAN M"
        },
        {
          "day": 3,
          "worker": "FRAN M"
        },
        {
          "day": 4,
          "worker": "HAMID"
        },
        {
          "day": 5,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Julio",
    "weeks": [
      [
        {
          "day": 6,
          "worker": "ANDRIY MS"
        },
        {
          "day": 7,
          "worker": "ANDRIY MS"
        },
        {
          "day": 8,
          "worker": "ANDRIY M"
        },
        {
          "day": 9,
          "worker": "ANDRIY M"
        },
        {
          "day": 10,
          "worker": "ANDRIY M"
        },
        {
          "day": 11,
          "worker": "HAMID"
        },
        {
          "day": 12,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 13,
          "worker": "MANUEL"
        },
        {
          "day": 14,
          "worker": "MANUEL"
        },
        {
          "day": 15,
          "worker": "MANUEL"
        },
        {
          "day": 16,
          "worker": "MANUEL"
        },
        {
          "day": 17,
          "worker": "MANUEL"
        },
        {
          "day": 18,
          "worker": "HAMID"
        },
        {
          "day": 19,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 20,
          "worker": "ANDRIY MS"
        },
        {
          "day": 21,
          "worker": "ANDRIY MS"
        },
        {
          "day": 22,
          "worker": "ANDRIY MS"
        },
        {
          "day": 23,
          "worker": "ANDRIY MS"
        },
        {
          "day": 24,
          "worker": "ANDRIY MS"
        },
        {
          "day": 25,
          "worker": "HAMID"
        },
        {
          "day": 26,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 27,
          "worker": "FRAN SM"
        },
        {
          "day": 28,
          "worker": "FRAN SM"
        },
        {
          "day": 29,
          "worker": "FRAN SM"
        },
        {
          "day": 30,
          "worker": "FRAN SM"
        },
        {
          "day": 31,
          "worker": "FRAN SM"
        },
        {
          "day": 1,
          "worker": "HAMID"
        },
        {
          "day": 2,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Agosto",
    "weeks": [
      [
        {
          "day": 3,
          "worker": "ANDRIY MS"
        },
        {
          "day": 4,
          "worker": "MANUEL"
        },
        {
          "day": 5,
          "worker": "MANUEL"
        },
        {
          "day": 6,
          "worker": "MANUEL"
        },
        {
          "day": 7,
          "worker": "MANUEL"
        },
        {
          "day": 8,
          "worker": "HAMID"
        },
        {
          "day": 9,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 10,
          "worker": "FRAN M"
        },
        {
          "day": 11,
          "worker": "FRAN M"
        },
        {
          "day": 12,
          "worker": null
        },
        {
          "day": 13,
          "worker": null
        },
        {
          "day": 14,
          "worker": null
        },
        {
          "day": 15,
          "worker": null
        },
        {
          "day": 16,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 17,
          "worker": null
        },
        {
          "day": 18,
          "worker": null
        },
        {
          "day": 19,
          "worker": null
        },
        {
          "day": 20,
          "worker": null
        },
        {
          "day": 21,
          "worker": null
        },
        {
          "day": 22,
          "worker": "HAMID"
        },
        {
          "day": 23,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 24,
          "worker": null
        },
        {
          "day": 25,
          "worker": null
        },
        {
          "day": 26,
          "worker": "FRAN SM"
        },
        {
          "day": 27,
          "worker": "FRAN SM"
        },
        {
          "day": 28,
          "worker": "FRAN SM"
        },
        {
          "day": 29,
          "worker": "HAMID"
        },
        {
          "day": 30,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Septiembre",
    "weeks": [
      [
        {
          "day": 31,
          "worker": "ANDRIY MS"
        },
        {
          "day": 1,
          "worker": "ANDRIY MS"
        },
        {
          "day": 2,
          "worker": "ANDRIY MS"
        },
        {
          "day": 3,
          "worker": "ANDRIY MS"
        },
        {
          "day": 4,
          "worker": "ANDRIY MS"
        },
        {
          "day": 5,
          "worker": "HAMID"
        },
        {
          "day": 6,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 7,
          "worker": "FRAN SM"
        },
        {
          "day": 8,
          "worker": "FRAN SM"
        },
        {
          "day": 9,
          "worker": "FRAN SM"
        },
        {
          "day": 10,
          "worker": "FRAN SM"
        },
        {
          "day": 11,
          "worker": "FRAN SM"
        },
        {
          "day": 12,
          "worker": "HAMID"
        },
        {
          "day": 13,
          "worker": "H"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 14,
          "worker": "ANDRIY MS"
        },
        {
          "day": 15,
          "worker": "FRAN M"
        },
        {
          "day": 16,
          "worker": "FRAN M"
        },
        {
          "day": 17,
          "worker": "FRAN M"
        },
        {
          "day": 18,
          "worker": "FRAN M"
        },
        {
          "day": 19,
          "worker": "HAMID"
        },
        {
          "day": 20,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 21,
          "worker": "FRAN SM"
        },
        {
          "day": 22,
          "worker": "FRAN SM"
        },
        {
          "day": 23,
          "worker": "FRAN SM"
        },
        {
          "day": 24,
          "worker": "FRAN SM"
        },
        {
          "day": 25,
          "worker": "FRAN SM"
        },
        {
          "day": 26,
          "worker": "HAMID"
        },
        {
          "day": 27,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 28,
          "worker": "ANDRIY MS"
        },
        {
          "day": 29,
          "worker": "ANDRIY MS"
        },
        {
          "day": 30,
          "worker": "ANDRIY MS"
        },
        {
          "day": 1,
          "worker": "ANDRIY MS"
        },
        {
          "day": 2,
          "worker": "ANDRIY MS"
        },
        {
          "day": 3,
          "worker": "HAMID"
        },
        {
          "day": 4,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ]
    ]
  },
  {
    "month": "Octubre",
    "weeks": [
      [
        {
          "day": 5,
          "worker": "FRAN SM"
        },
        {
          "day": 6,
          "worker": "FRAN SM"
        },
        {
          "day": 7,
          "worker": "FRAN SM"
        },
        {
          "day": 8,
          "worker": "FRAN SM"
        },
        {
          "day": 9,
          "worker": "FRAN SM"
        },
        {
          "day": 10,
          "worker": "HAMID"
        },
        {
          "day": 11,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 12,
          "worker": "ANDRIY"
        },
        {
          "day": 13,
          "worker": "ANDRIY MS"
        },
        {
          "day": 14,
          "worker": "ANDRIY MS"
        },
        {
          "day": 15,
          "worker": "ANDRIY MS"
        },
        {
          "day": 16,
          "worker": "ANDRIY MS"
        },
        {
          "day": 17,
          "worker": "HAMID"
        },
        {
          "day": 18,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "FRAN"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 19,
          "worker": "FRAN SM"
        },
        {
          "day": 20,
          "worker": "FRAN SM"
        },
        {
          "day": 21,
          "worker": "FRAN SM"
        },
        {
          "day": 22,
          "worker": "FRAN SM"
        },
        {
          "day": 23,
          "worker": "FRAN SM"
        },
        {
          "day": 24,
          "worker": "HAMID"
        },
        {
          "day": 25,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "MISAEL"
        },
        {
          "day": null,
          "worker": "MISAEL"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ],
      [
        {
          "day": 26,
          "worker": "ANDRIY MS"
        },
        {
          "day": 27,
          "worker": "ANDRIY MS"
        },
        {
          "day": 28,
          "worker": "ANDRIY MS"
        },
        {
          "day": 29,
          "worker": "ANDRIY MS"
        },
        {
          "day": 30,
          "worker": "ANDRIY MS"
        },
        {
          "day": 31,
          "worker": "HAMID"
        },
        {
          "day": 1,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Noviembre",
    "weeks": [
      [
        {
          "day": 2,
          "worker": "FRAN SM"
        },
        {
          "day": 3,
          "worker": "FRAN SM"
        },
        {
          "day": 4,
          "worker": "FRAN SM"
        },
        {
          "day": 5,
          "worker": "FRAN SM"
        },
        {
          "day": 6,
          "worker": "FRAN SM"
        },
        {
          "day": 7,
          "worker": "HAMID"
        },
        {
          "day": 8,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 9,
          "worker": "ANDRIY MS"
        },
        {
          "day": 10,
          "worker": "ANDRIY MS"
        },
        {
          "day": 11,
          "worker": "ANDRIY MS"
        },
        {
          "day": 12,
          "worker": "ANDRIY MS"
        },
        {
          "day": 13,
          "worker": "ANDRIY MS"
        },
        {
          "day": 14,
          "worker": "HAMID"
        },
        {
          "day": 15,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 16,
          "worker": "FRAN SM"
        },
        {
          "day": 17,
          "worker": "FRAN SM"
        },
        {
          "day": 18,
          "worker": "FRAN SM"
        },
        {
          "day": 19,
          "worker": "FRAN SM"
        },
        {
          "day": 20,
          "worker": "FRAN SM"
        },
        {
          "day": 21,
          "worker": "HAMID"
        },
        {
          "day": 22,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 23,
          "worker": "ANDRIY MS"
        },
        {
          "day": 24,
          "worker": "ANDRIY MS"
        },
        {
          "day": 25,
          "worker": "ANDRIY MS"
        },
        {
          "day": 26,
          "worker": "ANDRIY MS"
        },
        {
          "day": 27,
          "worker": "ANDRIY MS"
        },
        {
          "day": 28,
          "worker": "HAMID"
        },
        {
          "day": 29,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ]
    ]
  },
  {
    "month": "Diciembre",
    "weeks": [
      [
        {
          "day": 30,
          "worker": "FRAN SM"
        },
        {
          "day": 1,
          "worker": "FRAN SM"
        },
        {
          "day": 2,
          "worker": "FRAN SM"
        },
        {
          "day": 3,
          "worker": "FRAN SM"
        },
        {
          "day": 4,
          "worker": "FRAN SM"
        },
        {
          "day": 5,
          "worker": "HAMID"
        },
        {
          "day": 6,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 7,
          "worker": "ANDRIY MS"
        },
        {
          "day": 8,
          "worker": "ANDRIY MS"
        },
        {
          "day": 9,
          "worker": "ANDRIY MS"
        },
        {
          "day": 10,
          "worker": "ANDRIY MS"
        },
        {
          "day": 11,
          "worker": "ANDRIY MS"
        },
        {
          "day": 12,
          "worker": "HAMID"
        },
        {
          "day": 13,
          "worker": "H"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 14,
          "worker": "FRAN SM"
        },
        {
          "day": 15,
          "worker": "FRAN SM"
        },
        {
          "day": 16,
          "worker": "FRAN SM"
        },
        {
          "day": 17,
          "worker": "FRAN SM"
        },
        {
          "day": 18,
          "worker": "FRAN SM"
        },
        {
          "day": 19,
          "worker": "HAMID"
        },
        {
          "day": 20,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 21,
          "worker": "ANDRIY SM"
        },
        {
          "day": 22,
          "worker": "ANDRIY MS"
        },
        {
          "day": 23,
          "worker": "ANDRIY MS"
        },
        {
          "day": 24,
          "worker": null
        },
        {
          "day": 25,
          "worker": null
        },
        {
          "day": 26,
          "worker": "HAMID"
        },
        {
          "day": 27,
          "worker": "HAMID"
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        },
        {
          "day": null,
          "worker": null
        }
      ],
      [
        {
          "day": 28,
          "worker": "MANUEL"
        },
        {
          "day": 29,
          "worker": "MANUEL"
        },
        {
          "day": 30,
          "worker": "MANUEL"
        },
        {
          "day": 31,
          "worker": "MANUEL"
        },
        {
          "day": 1,
          "worker": "FRAN"
        },
        {
          "day": 2,
          "worker": null
        },
        {
          "day": 3,
          "worker": null
        }
      ],
      [
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        },
        {
          "day": null,
          "worker": "ANDRIY"
        }
      ],
      [
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "HAMID"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        },
        {
          "day": null,
          "worker": "LYUBEN"
        }
      ]
    ]
  }
] as const;

export const excelGenericMonths: ExcelGenericMonth[] = [] as const;

export const excelWorkerSheets: ExcelWorkerSheet[] = [
  {
    "sheet": "ADRIAN",
    "title": "GENERICO",
    "months": []
  },
  {
    "sheet": "AITOR",
    "title": "ANDRIY",
    "months": []
  },
  {
    "sheet": "ANDRIY",
    "title": "ANDRIY",
    "months": []
  },
  {
    "sheet": "FRAN",
    "title": "FRAN",
    "months": []
  },
  {
    "sheet": "HAMID",
    "title": "HAMID",
    "months": []
  },
  {
    "sheet": "JUAN",
    "title": "JUAN",
    "months": []
  },
  {
    "sheet": "LYUBEN",
    "title": "LYUBEN",
    "months": []
  },
  {
    "sheet": "MANUEL",
    "title": "MANUEL",
    "months": []
  },
  {
    "sheet": "MISAEL",
    "title": "NELO",
    "months": []
  },
  {
    "sheet": "NELO",
    "title": "NELO",
    "months": []
  },
  {
    "sheet": "SILVIO",
    "title": "SILVIO",
    "months": []
  },
  {
    "sheet": "OLEK",
    "title": "OLEK",
    "months": []
  },
  {
    "sheet": "RAQUEL HACER",
    "title": "RAQUEL",
    "months": []
  }
] as const;
