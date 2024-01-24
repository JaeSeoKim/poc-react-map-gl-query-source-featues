import { ExpressionSpecification } from "maplibre-gl";
import { ReactElement, useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import {
  MapGeoJSONFeature,
  MapSourceDataEvent,
  useMap,
} from "react-map-gl/maplibre";

export type QuerySourceFeaturesProps = {
  source: string;
  /**
   * A filter to limit query results.
   */
  filter?: ExpressionSpecification;
  /**
   * The name of the source layer to query. For vector tile sources,
   * this parameter is required. For GeoJSON sources, it is ignored.
   */
  sourceLayer?: string;
  /**
   * Whether to check if the [parameters.filter] conforms to the MapLibre Style Specification.
   * Disabling validation is a performance optimization that should only be used
   * if you have previously validated the values you will be passing to this function.
   *
   * @default true
   */
  validate?: boolean;
  render: React.FC<QuerySourceFeaturesRenderProps>;
};

export type QuerySourceFeaturesRenderProps = {
  data: MapGeoJSONFeature;
};

export const QuerySourceFeatures: React.FC<QuerySourceFeaturesProps> = ({
  source,
  filter,
  sourceLayer,
  validate,
  render: Render,
}) => {
  const { current: map } = useMap();
  const [data, setData] = useState<{
    [id: string]: ReactElement;
  }>({});

  useLayoutEffect(() => {
    if (!map) return;

    const updateDatas = () => {
      const features = map.querySourceFeatures(source, {
        filter,
        sourceLayer,
        validate,
      });

      // for immediately update
      flushSync(() => {
        setData((data) => {
          const newData: {
            [id: string]: ReactElement;
          } = {};

          let isDiff = false;

          features.forEach((feature) => {
            const id = feature.id!;
            if (data[id]) {
              newData[id] = data[id];
            } else {
              isDiff = true;
              newData[id] = (
                <Render
                  key={`__query-source-features-render-${id}__`}
                  data={feature}
                />
              );
            }
          });
          // for avoid rerendering
          if (
            !isDiff &&
            Object.keys(data).length === Object.keys(newData).length
          )
            return data;
          return newData;
        });
      });
    };

    const updateDataHandler = (e: MapSourceDataEvent) => {
      if (e.sourceId !== source || !e.isSourceLoaded) return;

      map.on("move", updateDatas);
      map.on("moveend", updateDatas);
      updateDatas();
    };
    map.on("data", updateDataHandler);
    return () => {
      map.off("data", updateDataHandler);
      map.off("move", updateDatas);
      map.off("moveend", updateDatas);
    };
  }, [Render, filter, map, source, sourceLayer, validate]);

  return Object.entries(data).map((data) => data[1]);
};
