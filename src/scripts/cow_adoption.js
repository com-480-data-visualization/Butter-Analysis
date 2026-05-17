import '../assets/style.css'
import * as d3 from 'd3';
import CowNames from '../../datasets/cattle-topNamesFemale.csv?url';
// import colors from 'tailwindcss/colors';

// Set up the HTML structure for picking the cow
document.querySelector('#adopt_a_cow').innerHTML = `
    <div class="flex flex-col items-center gap-6">
        
        <div class="text-center space-y-2">
            <h3 class="text-3xl font-black uppercase tracking-tight text-black">🐄 Adopt a Swiss Cow</h3>
            <p class="text-gray-800 font-medium leading-relaxed max-w-md mx-auto">
                Click the button below to randomly draw a cow from the top ten names per linguistic region! 
            </p>
            <p class="text-xs text-gray-500 font-bold uppercase tracking-wider">(28.02.2026, Identitas AG)</p>
        </div>
        
        <button id="draw-cow-btn" class="px-8 py-3 bg-red-500 text-white border-4 border-black rounded-lg font-black text-xl uppercase tracking-widest hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:translate-x-0 active:shadow-none transition-all duration-200">
            Meet Your Cow
        </button>
    
        <div class="w-full bg-white border-4 border-black border-dashed rounded-lg p-6 min-h-[160px] flex items-center justify-center">
            <div id="cow-result" class="flex flex-col items-center gap-3 text-center text-stone-900 w-full">
                <span class="text-gray-400 font-bold italic tracking-wide">Click the button to meet your cow...</span>
            </div>
        </div>

    </div>
`;

const cantons = {
    "fr":["Vaud", "Valais", "Fribourg", "Neuchâtel", "Jura", "Genève", "Berne"],
    "de":["Bern", "Zürich", "Aargau", "Luzern", "St. Gallen", "Thurgau", "Schaffhausen", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Graubünden", "Wallis", "Solothurn", "Basel-Stadt", "Basel-Landschaft", "Schwyz", "Obwalden", "Nidwalden", "Uri", "Freiburg", "Glarus", "Zug"],
    "it":["Ticino", "Grigioni"]
}

const languageRegion = {
    "fr": "French-speaking",
    "de": "German-speaking",
    "it": "Italian-speaking"
}

// Load the cow names
fetch(CowNames)
    .then(response => response.text())
    .then(rawText => {
        const lines = rawText.split('\n');
        lines.shift(); 
        const cleanedText = lines.join('\n');
        const data = d3.dsvFormat(";").parse(cleanedText);

        const button = document.getElementById('draw-cow-btn');
        const resultDiv = document.getElementById('cow-result');

        const allCantons = [];
        Object.entries(cantons).forEach(([language, cantonList]) => {
            cantonList.forEach(cantonName => {
                allCantons.push({ name: cantonName, lang: language });
            });
        });

        button.addEventListener('click', () => {
            const randomCantonIndex = Math.floor(Math.random() * allCantons.length);
            const selectedCanton = allCantons[randomCantonIndex];

            const matchingCows = data.filter(cow => 
                cow.OwnerLanguage.toLowerCase() === selectedCanton.lang
            );

            if (matchingCows.length === 0) {
                resultDiv.innerHTML = `<span class="text-red-500 font-bold">You adopted a mystery cow from ${selectedCanton.name}!</span>`;
                return;
            }

            const randomCowIndex = Math.floor(Math.random() * matchingCows.length);
            const cow = matchingCows[randomCowIndex];
            
            const cowOwnerLanguage = cow.OwnerLanguage.toLowerCase();
            const cowOwnerRegion = languageRegion[cowOwnerLanguage] || "Unknown region";
            const cowName = cow.Name;
            const cowNumber = cow.CountTotal - 1; 
            const cowRank = cow.RankLanguage;     

            // Updated UI rendering for the result
            resultDiv.innerHTML = `
                <div class="text-xl font-bold text-gray-700">Meet</div>
                <div class="text-4xl font-black text-red-600 uppercase tracking-tight -mt-2">${cowName}</div>
                
                <div class="bg-yellow-200 border-2 border-black rounded-md px-4 py-1 mt-1 mb-2 font-bold uppercase tracking-wider">
                    📍 Canton of ${selectedCanton.name}
                </div>
                
                <p class="text-gray-800 leading-relaxed  max-w-md">
                    She shares this name with <b>${cowNumber}</b> other cows, making it the <b>#${cowRank}</b> most popular name in the <b>${cowOwnerRegion}</b> part of Switzerland!
                </p>
            `;

            window.dispatchEvent(
                new CustomEvent('cow:selected', {
                    detail: {
                        name: cowName,
                        canton: selectedCanton.name,
                        region: cowOwnerRegion,
                    },
                })
            );
        });
    })
    .catch(error => {
        console.error("Error loading the cow dataset:", error);
        document.getElementById('cow-result').innerHTML = `<span class="text-red-500 font-bold">Oops! The cows escaped. Please try again later.</span>`;
    });