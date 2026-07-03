import {Composition} from 'remotion';
import {
  PetFigureTransform,
  petFigureTransformSchema,
} from './PetFigureTransform';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PetFigureTransform"
      component={PetFigureTransform}
      durationInFrames={240}
      fps={30}
      width={1080}
      height={1920}
      schema={petFigureTransformSchema}
      defaultProps={{
        sourceImage: 'assets/pet-adventurer/source.png',
        modelingImage: 'assets/pet-adventurer/modeling.png',
        figureImage: 'assets/pet-adventurer/figure.png',
        headline: '写真のかわいいを',
        subline: '3Dデータからフィギュアへ',
        finalLabel: 'FIGURE READY',
      }}
    />
  );
};
