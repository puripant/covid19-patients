const width = 500;
const height = 500;
const margin = { left: 50, right: 50, top: 50, bottom: 20 };
const cell_size = 10;

const date_scale = d3.scaleTime()
  .domain([new Date(2020, 0, 1), Date.now()])
  .range([0, width]);
const x_scale = d3.scaleLinear()
  .domain([0, width/cell_size])
  .range([3, width]);
const y_scale = d3.scaleLinear()
  .domain([0, height/cell_size])
  .range([0, height]);
const freq_scale = d3.scaleLinear()
  .domain([0, height/cell_size + 10])
  .range([0, height]);
const color_scale = d3.scaleOrdinal(["#1E1952", "#FCC20D"]) //(d3.schemeTableau10)
  // .domain([9, 10]);

const svg = d3.select('#chart')
  .append('svg')
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
const t = svg.transition().duration(750);

let names = [];
let cells = [];
let draw = () => {
  svg.selectAll('.patient')
      .data(names)
    .join(
      enter => enter.append('text'),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'patient')
      .text(d => d.number)
      .attr('text-anchor', 'end')
      .attr('fill', d => color_scale(d.infected_type))
      .attr('y', (d, i) => (i+1) * cell_size - 3)
    .transition(t)
      .delay(d => d.years/5)
      .attr('x', d => projections.x ? 0 : (date_scale(date_from_text(d.confirmed_date)) - cell_size/3))
      .style('opacity', () => projections.y ? 0 : 1);

  svg.selectAll('.cell')
      .data(cells)
    .join(
      enter => enter.append("rect")
        .call(enter => enter.append("svg:title")
          .text(d => `${d.number}`)
        ),
      update => update,
      exit => exit.remove()
    )
      .attr('class', 'cell')
      .attr('width', cell_size - 1)
      .attr('height', cell_size - 1)
      .attr('fill', d => color_scale(d.infected_type))
      .on('mouseover', d => {
        svg.selectAll('rect.cell')
          .filter(dd => {
            if (projections['default']) return dd.number === d.number;
            if (projections['x']) return dd.date_string === d.date_string;
            if (projections['y']) return dd.number === d.number;
          })
          .attr('fill', d => d3.rgb(color_scale(d.infected_type)).darker(2))
      })
      .on('mouseout', () => {
        svg.selectAll('rect.cell')
          .attr('fill', d => color_scale(d.infected_type));
      })
    .transition(t)
      .delay((d, i) => i/5)
      .attr('x', d => projections.x ? x_scale(d.date_order) : date_scale(d.date))
      .attr('y', d => projections.y ? freq_scale(d.stack) : y_scale(d.order));
  
  // Axes
  svg.select('.x-axis')
    .transition(t)
    .call(
      projections.x ? 
        d3.axisTop(x_scale) :
        d3.axisTop(date_scale)
          .ticks(d3.timeWeek.every(1))
          .tickFormat(date => `${date.getDate()} ${months[date.getMonth()]}`)
    );
  
  svg.selectAll('.label').remove();
  if (projections.x) {
    svg.append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'start')
      .attr('x', width)
      .attr('dx', 15)
      .attr('y', -19)
      .text('วัน');
  }
  // } else {
  //   svg.append('text')
  //     .attr('class', 'label')
  //     .attr('text-anchor', 'end')
  //     .attr('x', 0)
  //     .attr('dx', -10)
  //     .attr('y', -19)
  //     .text('พ.ศ.');
  // }

  // Legend
  svg.append("g")
    .attr("class", "legend")
    .attr("transform", `translate(${200},${height-100})`);
  svg.select(".legend")
    .classed("dark-background", projections['y'])
    .call(d3.legendColor()
      .shapeWidth(cell_size-1)
      .shapeHeight(cell_size-1)
      .shapePadding(0)
      .scale(color_scale)
    );
}

const project_buttons = {
  default: d3.select('#project-button-default'),
  x: d3.select('#project-button-x'),
  y: d3.select('#project-button-y')
}
let projections = { default: true, x: false, y: false };
let project_along = axis => {
  if (!projections[axis]) {
    for (let key in projections) {
      projections[key] = false;
      project_buttons[key].classed("highlighted", false);
    }
    projections[axis] = true;
    project_buttons[axis].classed("highlighted", true);
    
    draw();
  }
}

const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.', 'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
let month_from_thai_text = (text) => {
  return months.indexOf(text);
}
let date_from_text = (text) => {
  if (text) {
    let ddmm = text.split(/-| /);
    return new Date(2020, month_from_thai_text(ddmm[1]), +ddmm[0]);
  } else {
    return Date.now();
  }
}

d3.csv('data.csv').then(data => {
  names = data;
  names_by_date = {};
  data.forEach((d, idx) => {
    let counter = 0;
    for(let date = date_from_text(d.confirmed_date); date <= date_from_text(d.recover_date); date.setDate(date.getDate() + 1)) {
      let date_string = date.toString();
      if (!names_by_date[date_string]) {
        names_by_date[date_string] = [];
      }

      cells.push({
        number: d.number,
        nationality: d.nationality,
        gender: d.gender,
        age: d.age,
        occupation: d.occupation,
        origin: d.origin,
        confirmed_area: d.confirmed_area,
        confirmed_province: d.confirmed_province,
        hospital: d.hospital,
        hospital_province: d.hospital_province,
        infected_type: d.infected_type,
        infected_source: d.infected_source,
        status: d.status,
        confirmed_date: date_from_text(d.confirmed_date),
        recover_date: date_from_text(d.recover_date),
        date: new Date(date),
        date_string: date_string,
        date_order: counter++,
        order: idx,
        stack: names_by_date[date_string].length
      });

      names_by_date[date_string].push(d.number);
    }
    names[idx].years = (idx === 0) ? counter : (names[idx-1].years + counter);
  });
  console.log(cells)

  svg.append('g')
    .attr("class", "x-axis")
    .attr("transform", "translate(0,-10)");
  // svg.append("g")
  //   .attr("class", "x axis")
  //   .attr("transform", "translate(0,-10)");

  draw();
});
