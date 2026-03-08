import React from "react";
import { Dropdown, DropdownChangeEvent } from "primereact/dropdown";

export interface IndexURLs {
  top10: string;
  bottom10: string;
  topActive: string;
  rsiOverSold10: string;
  rsiOverBought10: string;
  momIncrease10: string;
  momDecrease10: string;
  rsOutperformers: string;
  rsUnderperformers: string;
  treemap: string;
}

export interface IndexOption {
  id: number;
  name: string;
  urls: IndexURLs;
}

const INDEX_OPTIONS: IndexOption[] = [
  {
    id: 1,
    name: "S&P 500",
    urls: {
      topActive: "/symbol/list_type2/40",
      top10: "/symbol/list_type2/41",
      bottom10: "/symbol/list_type2/42",
      rsiOverSold10: "/symbol/list_type2/47",
      rsiOverBought10: "/symbol/list_type2/49",
      momIncrease10: "/symbol/list_type2/51",
      momDecrease10: "/symbol/list_type2/53",
      rsOutperformers: "/symbol/list_type2/55",
      rsUnderperformers: "/symbol/list_type2/57",
      treemap: "/symbol/spytreemap",
    },
  },
  {
    id: 2,
    name: "Nasdaq 100",
    urls: {
      topActive: "/symbol/list_type2/43",
      top10: "/symbol/list_type2/44",
      bottom10: "/symbol/list_type2/45",
      rsiOverSold10: "/symbol/list_type2/48",
      rsiOverBought10: "/symbol/list_type2/50",
      momIncrease10: "/symbol/list_type2/52",
      momDecrease10: "/symbol/list_type2/54",
      rsOutperformers: "/symbol/list_type2/56",
      rsUnderperformers: "/symbol/list_type2/58",
      treemap: "/symbol/nasdaqtreemap",
    },
  },
];

interface IndexSelectorProps {
  value: IndexOption;
  onChange: (option: IndexOption) => void;
}

const IndexSelector: React.FC<IndexSelectorProps> = ({ value, onChange }) => {
  return (
    <Dropdown
      value={value}
      options={INDEX_OPTIONS}
      onChange={(e: DropdownChangeEvent) => onChange(e.value)}
      optionLabel="name"
      className="sv-dropdown-sm"
      panelClassName="sv-dropdown-sm-panel"
      style={{ maxWidth: 160 }}
    />
  );
};

export { INDEX_OPTIONS };
export default IndexSelector;
