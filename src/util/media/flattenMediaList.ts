export const flattenMediaList = (mediaList: MediaDefinition): Promise<MediumDefinition[]> => {
  return new Promise((resolve) => {
    const items: MediumDefinition[] = [];
    Object.values(mediaList.feeds).forEach(countryMedia => {
      items.push(...countryMedia);
    });
    resolve(items);
  });
}