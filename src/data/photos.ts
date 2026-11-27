export type Photo = {
  /** Bundled asset id from `require`. */
  source: number;
  width: number;
  height: number;
  /** Size of the bundled file, shown in low-data mode before a photo is loaded. */
  bytes: number;
  /** Plain description for screen readers. */
  alt: string;
  credit: { author: string; license: string; licenseUrl: string; sourceUrl: string; title: string };
};

/** Bundled content photos from Wikimedia Commons, with their credits (assets/images/content/CREDITS.md). */
export const photos: Record<string, Photo> = {
  'airport': {
    source: require('../../assets/images/content/airport.jpg'),
    width: 1400,
    height: 1050,
    bytes: 227671,
    alt: 'The terminal building of Kigali International Airport seen from the apron, with passengers walking towards it under a blue sky with clouds.',
    credit: { title: 'שדה התעופה הבינלאומי קיגאלי ברואנדה 01.jpg', author: 'Hanay', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D7%A9%D7%93%D7%94_%D7%94%D7%AA%D7%A2%D7%95%D7%A4%D7%94_%D7%94%D7%91%D7%99%D7%A0%D7%9C%D7%90%D7%95%D7%9E%D7%99_%D7%A7%D7%99%D7%92%D7%90%D7%9C%D7%99_%D7%91%D7%A8%D7%95%D7%90%D7%A0%D7%93%D7%94_01.jpg' },
  },
  'brussels': {
    source: require('../../assets/images/content/brussels.jpg'),
    width: 1400,
    height: 1053,
    bytes: 249032,
    alt: 'The Grand-Place in Brussels with the Gothic Maison du Roi and ornate guildhouses under a blue sky, as visitors cross the cobbled square.',
    credit: { title: 'Grote Markt (9379072012).jpg', author: 'Francisco Anzola', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Grote_Markt_(9379072012).jpg' },
  },
  'bus': {
    source: require('../../assets/images/content/bus.jpg'),
    width: 1400,
    height: 927,
    bytes: 171048,
    alt: 'Two public buses at a downtown Kigali bus terminal with curved shelters and people walking between the stops.',
    credit: { title: 'KBC Bus.jpg', author: 'GATETE Pacifique', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:KBC_Bus.jpg' },
  },
  'car-free-day': {
    source: require('../../assets/images/content/car-free-day.jpg'),
    width: 1400,
    height: 934,
    bytes: 191282,
    alt: 'High-angle view of a crowd of runners, many in matching yellow shirts, on a closed road in Kigali during the Kigali International Peace Marathon.',
    credit: { title: 'Aerial view of the kigali peace marathon.jpg', author: 'Isma250', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Aerial_view_of_the_kigali_peace_marathon.jpg' },
  },
  'city-hall': {
    source: require('../../assets/images/content/city-hall.jpg'),
    width: 1400,
    height: 889,
    bytes: 132791,
    alt: 'The City of Kigali headquarters behind the gorilla statue roundabout on KN 3 Avenue, with a zebra crossing in the foreground.',
    credit: { title: 'Inzu y\'umujyi wa Kigali Ingagi.jpg', author: 'EmmysonB', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Inzu_y%27umujyi_wa_Kigali_Ingagi.jpg' },
  },
  'fuel-station': {
    source: require('../../assets/images/content/fuel-station.jpg'),
    width: 1400,
    height: 951,
    bytes: 225876,
    alt: 'An Astrol petrol station in Nairobi, Kenya, with fuel pumps under a blue canopy, a car on the forecourt and barrier tape in the foreground.',
    credit: { title: 'Runda View Astrol station, Nairobi, KE.jpg', author: 'Daniel Case', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Runda_View_Astrol_station,_Nairobi,_KE.jpg' },
  },
  'health-centre': {
    source: require('../../assets/images/content/health-centre.jpg'),
    width: 1400,
    height: 933,
    bytes: 186754,
    alt: 'Brick and white buildings of Nyarugenge District Hospital in Kigali, with an ambulance parked by the entrance and a lawn in front.',
    credit: { title: 'DT9A7716.jpg', author: 'Benji1909', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', sourceUrl: 'https://commons.wikimedia.org/wiki/File:DT9A7716.jpg' },
  },
  'hills': {
    source: require('../../assets/images/content/hills.jpg'),
    width: 1400,
    height: 787,
    bytes: 249825,
    alt: 'Rows of tea bushes covering the rolling hills of Nyabihu District in Western Rwanda under a cloudy sky.',
    credit: { title: 'Tea plantation, Western Rwanda.jpg', author: 'Synkubito', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Tea_plantation,_Western_Rwanda.jpg' },
  },
  'kigali-convention-centre': {
    source: require('../../assets/images/content/kigali-convention-centre.jpg'),
    width: 1400,
    height: 933,
    bytes: 304963,
    alt: 'Aerial view of the domed Kigali Convention Centre beside the curved Radisson Blu hotel, with landscaped gardens, car parks and Kigali\'s hills behind.',
    credit: { title: 'An aerial of Kigali Convention Center on June 19, 2019. Photo by Emmanuel Kwizera.jpg', author: 'Emmanuel Kwizera', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:An_aerial_of_Kigali_Convention_Center_on_June_19,_2019._Photo_by_Emmanuel_Kwizera.jpg' },
  },
  'kigali-night': {
    source: require('../../assets/images/content/kigali-night.jpg'),
    width: 1400,
    height: 933,
    bytes: 195782,
    alt: 'Kigali\'s city centre lit up at dusk, with lights spreading across the surrounding hills under a deep blue sky.',
    credit: { title: 'Kigali2018Cropped.jpg', author: 'Adrien K', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kigali2018Cropped.jpg' },
  },
  'kigali-road': {
    source: require('../../assets/images/content/kigali-road.jpg'),
    width: 1400,
    height: 933,
    bytes: 169126,
    alt: 'A dual carriageway in Kigali with a white minibus and motorcycle taxis heading towards an office building and a tower block.',
    credit: { title: 'KN3 Road Deloitte Kigali.jpg', author: 'Kyle Taylor', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:KN3_Road_Deloitte_Kigali.jpg' },
  },
  'kigali-skyline': {
    source: require('../../assets/images/content/kigali-skyline.jpg'),
    width: 1400,
    height: 931,
    bytes: 197402,
    alt: 'Kigali\'s city-centre towers on a hilltop under a large white cloud, with green hillside neighbourhoods and trees in the foreground.',
    credit: { title: 'Kigali in the distance (32964431833).jpg', author: 'Francisco Anzola', license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Kigali_in_the_distance_(32964431833).jpg' },
  },
  'market': {
    source: require('../../assets/images/content/market.jpg'),
    width: 1400,
    height: 1050,
    bytes: 361250,
    alt: 'Vendors and shoppers among stacked egg trays and produce stalls under the roof of Kimironko Market in Kigali.',
    credit: { title: 'השוק המרכזי קימירונקו בקיגאלי בירת רואנדה (15).jpg', author: 'Hanay', license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:%D7%94%D7%A9%D7%95%D7%A7_%D7%94%D7%9E%D7%A8%D7%9B%D7%96%D7%99_%D7%A7%D7%99%D7%9E%D7%99%D7%A8%D7%95%D7%A0%D7%A7%D7%95_%D7%91%D7%A7%D7%99%D7%92%D7%90%D7%9C%D7%99_%D7%91%D7%99%D7%A8%D7%AA_%D7%A8%D7%95%D7%90%D7%A0%D7%93%D7%94_(15).jpg' },
  },
  'moto-taxi': {
    source: require('../../assets/images/content/moto-taxi.jpg'),
    width: 1400,
    height: 933,
    bytes: 229719,
    alt: 'Moto-taxi drivers in helmets and red vests waiting on their motorcycles at a roadside stop beside a KN 7 Avenue street sign.',
    credit: { title: 'Motorists stop.jpg', author: 'Freddiemanzi', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Motorists_stop.jpg' },
  },
  'musanze': {
    source: require('../../assets/images/content/musanze.jpg'),
    width: 1400,
    height: 933,
    bytes: 160034,
    alt: 'Mount Sabyinyo rising behind red-roofed houses and fields near Musanze in early morning light.',
    credit: { title: 'Musanze\'s Volcano (46355800961).jpg', author: 'Andrew Moore', license: 'CC BY-SA 2.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/2.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Musanze%27s_Volcano_(46355800961).jpg' },
  },
  'parliament': {
    source: require('../../assets/images/content/parliament.jpg'),
    width: 1400,
    height: 933,
    bytes: 149287,
    alt: 'The white Parliament of Rwanda building in Kimihurura, Kigali, above a grassy bank under a pale sky.',
    credit: { title: 'Inteko ishinga amategeko y’u Rwanda.jpg', author: 'UWIMPUHWE Va', license: 'CC BY 4.0', licenseUrl: 'https://creativecommons.org/licenses/by/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Inteko_ishinga_amategeko_y%E2%80%99u_Rwanda.jpg' },
  },
  'rain-kigali': {
    source: require('../../assets/images/content/rain-kigali.jpg'),
    width: 1400,
    height: 933,
    bytes: 167760,
    alt: 'Dark rain clouds gathering over green tea-covered hills in rural Rwanda.',
    credit: { title: 'Imvura ikubye 01.jpg', author: 'Muhirehussein12', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Imvura_ikubye_01.jpg' },
  },
  'school-students': {
    source: require('../../assets/images/content/school-students.jpg'),
    width: 1400,
    height: 933,
    bytes: 252476,
    alt: 'A two-storey secondary school building in Rwanda with blue doors and railings, facing a dirt courtyard planted with young trees.',
    credit: { title: 'Secondary school.jpg', author: 'Tuyishimejosue', license: 'CC0', licenseUrl: 'http://creativecommons.org/publicdomain/zero/1.0/deed.en', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Secondary_school.jpg' },
  },
  'umuganda': {
    source: require('../../assets/images/content/umuganda.jpg'),
    width: 1400,
    height: 933,
    bytes: 166625,
    alt: 'Residents working a field with hoes during Umuganda community work, seen from behind under a pale sky.',
    credit: { title: 'Umuganda.jpg', author: 'Masako Kato', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Umuganda.jpg' },
  },
  'university': {
    source: require('../../assets/images/content/university.jpg'),
    width: 1400,
    height: 929,
    bytes: 160014,
    alt: 'The multi-storey University of Rwanda headquarters building, with a few people walking along the driveway in front.',
    credit: { title: 'University of Rwanda headquarters.jpg', author: 'Hirwa94', license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0', sourceUrl: 'https://commons.wikimedia.org/wiki/File:University_of_Rwanda_headquarters.jpg' },
  },
};


export function photo(key: string | undefined): Photo | undefined {
  return key ? photos[key] : undefined;
}
