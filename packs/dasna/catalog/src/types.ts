export interface Product {
    id: string;
    name: string;
    type: string;
    size: string;
    price: number;
    firmness: string | null;
    goodFor: string[];
    warrantyYears: number;
}