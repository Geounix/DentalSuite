import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Treatment Catalog from procedures.json...');
    const jsonPath = path.resolve(__dirname, '../../procedures.json');

    if (!fs.existsSync(jsonPath)) {
        console.error(`File not found: ${jsonPath}`);
        process.exit(1);
    }

    let fileContent = fs.readFileSync(jsonPath, 'utf-8');
    // Strip BOM if present (PowerShell's ConvertTo-Json often adds it)
    if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1);
    }
    let procedures: any[] = [];
    try {
        procedures = JSON.parse(fileContent);
    } catch (err) {
        console.error('Failed to parse JSON file', err);
        process.exit(1);
    }

    let imported = 0;
    for (const proc of procedures) {
        const name = proc['Procedimientos'];
        let priceStr = proc['Precios'];
        if (!name) continue;

        // Default to 0 if price is empty or invalid
        let price = 0;
        if (priceStr && typeof priceStr === 'string') {
            priceStr = priceStr.replace(/[^0-9.]/g, '');
            if (priceStr) price = parseFloat(priceStr);
        } else if (typeof priceStr === 'number') {
            price = priceStr;
        }

        // Upsert so it doesn't duplicate if script is run multiple times
        await prisma.treatmentCatalog.create({
            data: {
                name: name.trim(),
                price: price || 0,
            }
        });
        imported++;
    }

    console.log(`✅ Seeded ${imported} procedures into the Treatment Catalog.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
