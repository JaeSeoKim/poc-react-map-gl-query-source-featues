import Map, {
  NavigationControl,
  Source,
  Layer,
  Marker,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import type { ExpressionSpecification } from "maplibre-gl";
import { QuerySourceFeatures } from "./query-source-features";
import { MapGeoJSONFeature } from "react-map-gl/maplibre";

// filters for classifying earthquakes into five categories based on magnitude
const mag1: ExpressionSpecification = ["<", ["get", "mag"], 2];
const mag2: ExpressionSpecification = [
  "all",
  [">=", ["get", "mag"], 2],
  ["<", ["get", "mag"], 3],
];
const mag3: ExpressionSpecification = [
  "all",
  [">=", ["get", "mag"], 3],
  ["<", ["get", "mag"], 4],
];
const mag4: ExpressionSpecification = [
  "all",
  [">=", ["get", "mag"], 4],
  ["<", ["get", "mag"], 5],
];
const mag5: ExpressionSpecification = [">=", ["get", "mag"], 5];

// colors to use for the categories
const colors = ["#fed976", "#feb24c", "#fd8d3c", "#fc4e2a", "#e31a1c"];

export default function App() {
  return (
    <>
      <Map
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 0.3,
        }}
        minZoom={2}
        mapStyle="https://api.maptiler.com/maps/streets/style.json?key=get_your_own_OpIi9ZULNHzrESv6T2vL"
      >
        <NavigationControl />
        <Source
          id="earthquakes"
          type="geojson"
          data="https://maplibre.org/maplibre-gl-js/docs/assets/earthquakes.geojson"
          cluster={true}
          clusterRadius={80}
          clusterProperties={{
            // keep separate counts for each magnitude category in a cluster
            mag1: ["+", ["case", mag1, 1, 0]],
            mag2: ["+", ["case", mag2, 1, 0]],
            mag3: ["+", ["case", mag3, 1, 0]],
            mag4: ["+", ["case", mag4, 1, 0]],
            mag5: ["+", ["case", mag5, 1, 0]],
          }}
        >
          <Layer
            id="earthquake_circle"
            type="circle"
            source="earthquakes"
            filter={["!=", "cluster", true]}
            paint={{
              "circle-color": [
                "case",
                mag1,
                colors[0],
                mag2,
                colors[1],
                mag3,
                colors[2],
                mag4,
                colors[3],
                colors[4],
              ],
              "circle-opacity": 0.6,
              "circle-radius": 12,
            }}
          />
          <Layer
            id="earthquake_label"
            type="symbol"
            source="earthquakes"
            filter={["!=", "cluster", true]}
            layout={{
              "text-field": [
                "number-format",
                ["get", "mag"],
                { "min-fraction-digits": 1, "max-fraction-digits": 1 },
              ],
              "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
              "text-size": 10,
            }}
            paint={{
              "text-color": [
                "case",
                ["<", ["get", "mag"], 3],
                "black",
                "white",
              ],
            }}
          />
        </Source>
        <QuerySourceFeatures
          source="earthquakes"
          filter={["==", "cluster", true]}
          render={({ data }) => {
            if (data.geometry.type === "Point") {
              return (
                <Marker
                  longitude={data.geometry.coordinates[0]}
                  latitude={data.geometry.coordinates[1]}
                >
                  <DonutChart properties={data.properties!} />
                </Marker>
              );
            }
            return null;
          }}
        />
      </Map>
    </>
  );
}

type DonutChartProps = {
  properties: NonNullable<MapGeoJSONFeature["properties"]>;
};

const DonutChart: React.FC<DonutChartProps> = ({ properties }) => {
  const counts = [
    properties.mag1,
    properties.mag2,
    properties.mag3,
    properties.mag4,
    properties.mag5,
  ];
  let total = 0;
  const offsets: number[] = [];
  counts.forEach((_, i) => {
    offsets.push(total);
    total += counts[i];
  });
  const fontSize =
    total >= 1000 ? 22 : total >= 100 ? 20 : total >= 10 ? 18 : 16;
  const r = total >= 1000 ? 50 : total >= 100 ? 32 : total >= 10 ? 24 : 18;
  const r0 = Math.round(r * 0.6);
  const w = r * 2;

  return (
    <div>
      <svg
        width={w}
        height={w}
        viewBox={`0 0 ${w} ${w}`}
        textAnchor="middle"
        style={{
          font: `${fontSize}px sans-serif`,
          display: "block",
        }}
      >
        {offsets.map((offset, i) => {
          const start = offset / total;
          const end = (offset + counts[i]) / total;
          return (
            <DonutSegment
              key={`__DonutSegment__${start}_${end}_${r}_${r0}_${colors[i]}`}
              start={start}
              end={end}
              r={r}
              r0={r0}
              color={colors[i]}
            />
          );
        })}
        <circle cx={r} cy={r} r={r0} fill="white" />
        <text dominantBaseline="central" transform={`translate(${r}, ${r})`}>
          {total.toLocaleString()}
        </text>
      </svg>
    </div>
  );
};

type DonutSegmentProps = {
  start: number;
  end: number;
  r: number;
  r0: number;
  color: string;
};

const DonutSegment: React.FC<DonutSegmentProps> = ({
  start,
  end,
  r,
  r0,
  color,
}) => {
  if (end - start === 1) end -= 0.00001;
  const a0 = 2 * Math.PI * (start - 0.25);
  const a1 = 2 * Math.PI * (end - 0.25);
  const x0 = Math.cos(a0),
    y0 = Math.sin(a0);
  const x1 = Math.cos(a1),
    y1 = Math.sin(a1);
  const largeArc = end - start > 0.5 ? 1 : 0;

  return (
    <path
      d={[
        `M ${r + r0 * x0} ${r + r0 * y0}`,
        `L ${r + r * x0} ${r + r * y0}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${r + r * x1} ${r + r * y1}`,
        `L ${r + r0 * x1} ${r + r0 * y1}`,
        `A ${r0} ${r0} 0 ${largeArc} 0 ${r + r0 * x0} ${r + r0 * y0}`,
      ].join(" ")}
      fill={color}
    />
  );
};
