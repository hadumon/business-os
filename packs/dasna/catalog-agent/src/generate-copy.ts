import type { Product } from "@dasna/catalog";

export interface ProductCopy {
    description: string;
    bulletSpecs: string[];
    seo: {
        metaTitle: string;
        metaDescription: string;
        keywords: string[];
    };
}

function titleCaseWords(s: string): string {
    return s.split(/[-_]/g).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function generateCopy(product: Product): ProductCopy {
    const useCases = product.goodFor.map((tag) => titleCaseWords(tag)).join(", ");
    const firmnessPhrase = product.firmness ? `${product.firmness} firmness` : "a range of comfort options";

    const description = [
        `The ${product.name} is a ${titleCaseWords(product.type)} mattress`,
        product.size ? ` in ${product.size} size` : "",
        `, offering ${firmnessPhrase}.`,
        product.goodFor.length > 0 ? ` Ideal for ${useCases.toLowerCase()}.` : "",
        ` Backed by a ${product.warrantyYears || "limited"}-year warranty, it's built for lasting comfort and support.`,
    ].join("");

    const bulletSpecs = [
        `Type: ${titleCaseWords(product.type)}`,
        `Size: ${product.size || "n/a"}`,
        `Firmness: ${product.firmness || "n/a"}`,
        `Warranty: ${product.warrantyYears ? `${product.warrantyYears} years` : "n/a"}`,
        `Price: Rs. ${product.price.toLocaleString()}`,
    ];

    const keywords = [
        product.type.replace("-", " "),
        "mattress",
        product.size,
        ...product.goodFor.map((g) => g.replace("-", " ")),
    ].filter((k): k is string => Boolean(k));

    const seo = {
        metaTitle: `${product.name} | Dasna Ghar`,
        metaDescription: `${product.name} - ${titleCaseWords(product.type)} mattress${product.size ? `, ${product.size} size` : ""
            }. ${product.goodFor.length > 0 ? `Great for ${useCases.toLowerCase()}. ` : ""}Shop now at Dasna Ghar.`.slice(0, 160),
        keywords: [...new Set(keywords)],
    };

    return { description, bulletSpecs, seo };
}