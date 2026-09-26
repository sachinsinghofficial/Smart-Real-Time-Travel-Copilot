/* Photo windows from the user's reference sheets. Source files remain unchanged. */
import type {CSSProperties} from 'react';
const sheets:Record<string,[number,number]>={cuisines:[2048,756],vehicles:[2048,599],places:[2048,1147],heritage:[2042,624],food:[2048,1365],crafts:[2048,1375],india:[2048,955]};
export default function ReferencePhoto({sheet,rect,alt,className='',style}:{sheet:string;rect:[number,number,number,number];alt:string;className?:string;style?:CSSProperties}){
 const [x,y,w,h]=rect,[sw,sh]=sheets[sheet];
 return <span role="img" aria-label={alt} className={'reference-photo '+className} style={{aspectRatio:`${w}/${h}`,...style}}><img src={`/images/reference/${sheet}.png`} alt="" draggable={false} loading="lazy" style={{position:'absolute',width:`${sw/w*100}%`,height:`${sh/h*100}%`,maxWidth:'none',left:`${-x/w*100}%`,top:`${-y/h*100}%`}}/></span>;
}
