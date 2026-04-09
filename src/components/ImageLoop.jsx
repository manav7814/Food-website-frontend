import dishOne from "../images/pngtree-delicious-paneer-butter-masala-on-white-background-png-image_13347750.png";
import  dishtwo  from "../images/ai-generated-a-bowl-of-chinese-noodles-isolated-on-a-transparent-background-top-view-png.png";
import dishFour from "../images/of-pizza-with-no-background-with-white-back-free-photo.jpg";
import dishFive from "../images/depositphotos_446839174-stock-photo-methi-paneer-sabzi-indian-style-removebg-preview.png";
import disheleven from "../images/428-4281112_soft-drinks-png-cool-drinks-images-png-transparent.png";
import dishSix from "../images/ai-generated-delicious-falafel-burger-on-transparent-background-png.png";
import dishSeven from "../images/ai-generated-a-plate-of-fried-rice-isolated-on-a-transparent-background-top-view-cut-out-png.png";
import dishEight from "../images/pasta-isolated-on-a-transparent-background-png.png";
import  dishNine from "../images/1000_F_599680039_azhNwl1HpHQXzSVuvxLzKAQhzUD5yGiU.jpg";
import  dishTen from "../images/gobi-manchurian-appetizer-white-plate-isolated-transparent-background_220739-36092.jpg";

const images = [
  dishOne,
  dishtwo,
  dishFour,
  dishFive,
  dishSix,
  dishSeven,
  dishEight,
  dishNine,
  dishTen,
  disheleven
];

export default function ImageLoop() {
  const loopImages = [...images, ...images];

  return (
    <section className="image-loop" aria-label="Featured dishes">
      <div className="image-loop-track">
        {loopImages.map((src, index) => (
          <div className="image-loop-item" key={`${src}-${index}`}>
            <img src={src} alt={`Dish ${index + 1}`} loading="lazy" />
          </div>
        ))}
      </div>
    </section>
  );
}
