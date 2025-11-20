import React from 'react';
import getImageUrl from '../utils/getImageUrl';

const Image = ({ image, alt = '', className = '', style = {}, fallback = '/no-image.jpg' }) => {
  const src = image ? getImageUrl(image) : fallback;
  return <img src={src} alt={alt} className={className} style={style} />;
};

export default Image;
