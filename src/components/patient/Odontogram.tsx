
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const adultUpperRight = [18, 17, 16, 15, 14, 13, 12, 11];
const adultUpperLeft = [21, 22, 23, 24, 25, 26, 27, 28];
const adultLowerLeft = [38, 37, 36, 35, 34, 33, 32, 31];
const adultLowerRight = [41, 42, 43, 44, 45, 46, 47, 48];

const pediatricUpperRight = [55, 54, 53, 52, 51];
const pediatricUpperLeft = [61, 62, 63, 64, 65];
const pediatricLowerLeft = [75, 74, 73, 72, 71];
const pediatricLowerRight = [81, 82, 83, 84, 85];

export const conditions = {
  'AMF': 'Amalgam Filling',
  'COF': 'Composite Filling',
  'GIF': 'Glass Ionomer Filling',
  'FIS': 'Fissure Sealant',
  'PFR': 'Partial Fracture',
  'CFR': 'Crown Fracture',
  'RFR': 'Root Fracture',
  'RCT': 'Root Canal Treatment',
  'FUL': 'Full Metal Crown',
  'POC': 'Porcelain Crown',
  'MCR': 'Metal-Porcelain Crown',
  'INL': 'Inlay',
  'ONL': 'Onlay',
  'IM': 'Impaction',
  'UNE': 'Unerupted',
  'MIS': 'Missing',
  'PRE': 'Premolar Anomaly',
  'ATT': 'Attrition',
  'ABR': 'Abrasion',
  'ARR': 'Root Anomaly',
  'PON': 'Pontic',
  'RET': 'Retainer',
  'ABU': 'Abutment',
  'DIC': 'Dicar (Non-Vital)',
  'PRA': 'Periapical Lesion',
  'MIG': 'Migration',
  'PER': 'Persistence',
  'CAR': 'Caries',
  'RRX': 'Root Remnant',
};

const Tooth = ({ toothNumber, conditionKey, onChange, readOnly }) => {
  const [open, setOpen] = React.useState(false);

  const handleSelectCondition = (key) => {
    onChange(toothNumber, key);
    setOpen(false);
  };
  
  const handleClear = () => {
    onChange(toothNumber, undefined);
    setOpen(false);
  }

  const conditionText = conditionKey || toothNumber;

  return (
    <div className="flex flex-col items-center">
      <Label className="text-xs">{toothNumber}</Label>
      {readOnly ? (
        <div className={cn("flex items-center justify-center w-10 h-10 border rounded", conditionKey ? "bg-blue-100 text-blue-800 font-bold" : "bg-gray-100")}>
          <span className="text-xs">{conditionText}</span>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("w-10 h-10 p-0", conditionKey ? "bg-blue-200 text-blue-900 font-bold" : "")}>
              <span className="text-xs">{conditionText}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0">
            <div className="flex justify-between items-center p-2 border-b">
              <h4 className="font-semibold">Gigi {toothNumber}</h4>
              <Button variant="ghost" size="sm" onClick={handleClear}><XIcon className="w-4 h-4 mr-1"/> Hapus</Button>
            </div>
            <ScrollArea className="h-72">
              <div className="p-1">
                {Object.entries(conditions).map(([key, description]) => (
                  <Button
                    key={key}
                    variant="ghost"
                    className="w-full justify-start text-left h-auto"
                    onClick={() => handleSelectCondition(key)}
                  >
                    <div>
                      <span className="font-semibold">{key}</span>: {description}
                    </div>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};

const ToothRow = ({ toothNumbers, value, onChange, readOnly }) => (
  <div className="flex justify-center gap-1">
    {toothNumbers.map((num) => (
      <Tooth key={num} toothNumber={num} conditionKey={value?.[num]} onChange={onChange} readOnly={readOnly} />
    ))}
  </div>
);

export const Odontogram = ({ value, onChange, readOnly = false }) => {
  const handleToothChange = (toothNumber, condition) => {
    const newValue = { ...value, [toothNumber]: condition };
    if (condition === undefined) {
      delete newValue[toothNumber];
    }
    onChange(newValue);
  };
  
  return (
    <div className="p-4 border rounded-md bg-white">
       <Tabs defaultValue="adult" className="w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Odontogram</h3>
          {!readOnly && (
            <TabsList>
              <TabsTrigger value="adult">Gigi Dewasa</TabsTrigger>
              <TabsTrigger value="pediatric">Gigi Anak</TabsTrigger>
            </TabsList>
          )}
        </div>

        <TabsContent value="adult">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-center text-gray-600">Gigi Dewasa</h4>
            <div className="flex">
              <div className="w-1/2 pr-1 border-r border-dashed"><ToothRow toothNumbers={adultUpperRight} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
              <div className="w-1/2 pl-1"><ToothRow toothNumbers={adultUpperLeft} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
            </div>
            <div className="flex mt-2">
              <div className="w-1/2 pr-1 border-r border-dashed"><ToothRow toothNumbers={adultLowerRight.slice().reverse()} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
              <div className="w-1/2 pl-1"><ToothRow toothNumbers={adultLowerLeft.slice().reverse()} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="pediatric">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-center text-gray-600">Gigi Susu/Anak</h4>
            <div className="flex">
              <div className="w-1/2 pr-1 border-r border-dashed"><ToothRow toothNumbers={pediatricUpperRight} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
              <div className="w-1/2 pl-1"><ToothRow toothNumbers={pediatricUpperLeft} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
            </div>
            <div className="flex mt-2">
              <div className="w-1/2 pr-1 border-r border-dashed"><ToothRow toothNumbers={pediatricLowerRight.slice().reverse()} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
              <div className="w-1/2 pl-1"><ToothRow toothNumbers={pediatricLowerLeft.slice().reverse()} value={value} onChange={handleToothChange} readOnly={readOnly} /></div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
